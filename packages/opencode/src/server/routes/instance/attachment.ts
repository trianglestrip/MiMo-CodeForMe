import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import { Effect } from "effect"
import z from "zod"
import { createHash } from "node:crypto"
import { mkdir, rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { SessionCwd } from "@/tool/session-cwd"
import { isImageAttachment, sniffAttachmentMime } from "@/util/media"
import { jsonRequest } from "./trace"
import { errors } from "../../error"

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// Extract a sanitized extension from a client-supplied filename. We only keep
// `[a-zA-Z0-9]` characters and cap the length at 12 to avoid path traversal
// or absurd extensions. The storage base name is always the content sha256,
// so the client never controls the on-disk path.
function safeExtension(name: string | undefined): string {
  if (!name) return ""
  const dot = name.lastIndexOf(".")
  if (dot < 0) return ""
  const ext = name
    .slice(dot + 1)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12)
  return ext ? "." + ext : ""
}

export const AttachmentRoutes = (): Hono =>
  new Hono().post(
    "/:sessionID/attachments/upload",
    describeRoute({
      summary: "Upload attachment",
      description:
        "Persist an uploaded file into the session working directory under `.attachments/` with content-addressed " +
        "naming (sha256). Re-uploading identical bytes is idempotent (no rewrite). Returns a reference " +
        "({ id, sha256, path, absPath, mediaType, bytes, name }) that callers can hand to the model via a path " +
        "reference instead of inlining base64 bytes. Image uploads are validated against their magic bytes.",
      operationId: "session.attachment.upload",
      responses: {
        200: {
          description: "Uploaded attachment reference",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  id: z.string(),
                  sha256: z.string(),
                  path: z.string(),
                  absPath: z.string(),
                  mediaType: z.string(),
                  bytes: z.number(),
                  name: z.string(),
                }),
              ),
            },
          },
        },
        ...errors(400, 404, 413, 415),
      },
    }),
    validator(
      "param",
      z.object({
        sessionID: SessionID.zod,
      }),
    ),
    async (c) => {
      const sessionID = c.req.valid("param").sessionID

      // Parse multipart/form-data. `all: true` keeps file parts as Blob/File.
      const body = await c.req.parseBody({ all: true })
      const rawField = body["file"]
      const raw = Array.isArray(rawField) ? rawField[0] : rawField
      if (!(raw instanceof Blob)) {
        return c.json({ error: "file field (Blob/File) is required" }, 400)
      }

      const clientName =
        typeof body["name"] === "string" && body["name"].length > 0
          ? body["name"]
          : raw instanceof File
            ? raw.name
            : undefined
      const mediaType =
        (typeof body["mediaType"] === "string" && body["mediaType"]) ||
        raw.type ||
        "application/octet-stream"

      // svg is a text format: treat it as a regular file (read tool), not vision bytes
      const isImage = isImageAttachment(mediaType)
      const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
      if (raw.size > maxBytes) {
        return c.json(
          { error: "payload too large", maxBytes, mediaType },
          413,
        )
      }

      const buf = Buffer.from(await raw.arrayBuffer())

      // Declared image types must match the actual magic bytes (mirrors the
      // deepseek-harness IMAGE_TYPE_MISMATCH check). Non-image types are not
      // sniff-validated because they are read back via the `read` tool, not
      // decoded as vision content.
      if (isImage) {
        const sniffed = sniffAttachmentMime(buf.subarray(0, 4096), "application/octet-stream")
        if (sniffed !== mediaType) {
          return c.json(
            { error: "ATTACHMENT_TYPE_MISMATCH", declared: mediaType, detected: sniffed },
            415,
          )
        }
      }

      const sha256 = createHash("sha256").update(buf).digest("hex")

      return jsonRequest("AttachmentRoutes.upload", c, function* () {
        const session = yield* Session.Service
        const s = yield* session.get(sessionID)
        // 落盘目录 = 会话显式 cwd 覆盖 ?? 会话记录的工作目录。
        // 不能用 SessionCwd.get()（其回退是当前实例根目录，跨实例请求时会落错位置）。
        const cwd = SessionCwd.tryGet(sessionID) ?? s.directory

        const attDir = path.join(cwd, ".attachments")
        yield* Effect.tryPromise(() => mkdir(attDir, { recursive: true }))

        const fileName = sha256 + safeExtension(clientName)
        const absPath = path.join(attDir, fileName)

        // Content-addressed dedupe: identical bytes already on disk are reused.
        const exists = yield* Effect.tryPromise(() => stat(absPath)).pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        )

        if (!exists) {
          // Atomic-ish write: stage to a temp name, then rename into place.
          const tmpPath = absPath + ".tmp"
          yield* Effect.tryPromise(() => writeFile(tmpPath, buf))
          yield* Effect.tryPromise(() => rename(tmpPath, absPath))
        }

        return {
          id: sha256,
          sha256,
          path: ".attachments/" + fileName,
          absPath,
          mediaType,
          bytes: buf.length,
          name: clientName ?? fileName,
        }
      })
    },
  )
