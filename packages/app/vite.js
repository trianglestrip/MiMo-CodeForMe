import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"

const theme = fileURLToPath(new URL("./public/oc-theme-preload.js", import.meta.url))
const publicDir = fileURLToPath(new URL("./public", import.meta.url))

const mime = {
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
}

function contentType(file) {
  return mime[path.extname(file).toLowerCase()] ?? "application/octet-stream"
}

function resolvePointer(file) {
  const content = readFileSync(file, "utf8").trim()
  if (!content.startsWith("../")) return
  const target = path.resolve(path.dirname(file), content)
  if (!existsSync(target)) return
  return target
}

function publicFile(pathname) {
  const rel = pathname.replace(/^\//, "")
  if (!rel || rel.includes("..")) return
  const file = path.resolve(publicDir, rel)
  if (!file.startsWith(path.resolve(publicDir))) return
  return file
}

function walkPublic(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name)
    if (statSync(file).isDirectory()) {
      out.push(...walkPublic(file, base))
      continue
    }
    const target = resolvePointer(file)
    if (target) out.push({ file, rel: path.relative(base, file), target })
  }
  return out
}

function publicPointerPlugin() {
  return {
    name: "opencode-desktop:public-pointers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.method !== "GET") return next()
        const pathname = decodeURIComponent(new URL(req.url, "http://vite").pathname)
        if (pathname === "/") return next()
        const file = publicFile(pathname)
        if (!file || !existsSync(file)) return next()
        const target = resolvePointer(file)
        if (!target) return next()
        res.setHeader("Content-Type", contentType(target))
        createReadStream(target).pipe(res)
      })
    },
    writeBundle(options) {
      if (!options.dir) return
      for (const item of walkPublic(publicDir)) {
        const dest = path.join(options.dir, item.rel)
        mkdirSync(path.dirname(dest), { recursive: true })
        copyFileSync(item.target, dest)
      }
    },
  }
}

/**
 * @type {import("vite").PluginOption}
 */
export default [
  publicPointerPlugin(),
  {
    name: "opencode-desktop:config",
    config() {
      return {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
          },
        },
        worker: {
          format: "es",
        },
      }
    },
  },
  {
    name: "opencode-desktop:theme-preload",
    transformIndexHtml(html) {
      return html.replace(
        '<script id="oc-theme-preload-script" src="/oc-theme-preload.js"></script>',
        `<script id="oc-theme-preload-script">${readFileSync(theme, "utf8")}</script>`,
      )
    },
  },
  tailwindcss(),
  solidPlugin(),
]
