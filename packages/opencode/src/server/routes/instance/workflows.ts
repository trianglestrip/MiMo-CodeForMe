import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { lazy } from "@/util/lazy"
import { Identifier } from "@/id/id"
import { workflowRef } from "@/workflow/runtime-ref"
import { jsonRequest } from "./trace"
import type { SessionID } from "@/session/schema"
import { Effect } from "effect"
import { Agent } from "@/agent/agent"
import { Instance } from "@/project/instance"
import { Session } from "@/session"
import { validateWorkflowGraph } from "@/workflow/graph/validate"
import { resolveExpertTeamWorkflow } from "@/workflow/graph/resolve"
import { compileWorkflowGraph } from "@/workflow/graph/compile"
import { ModelID, ProviderID } from "@/provider/schema"

// Read-only routes (transcript/structure) accept BOTH runID shapes: a top-level
// run is `wf_` + 26-char Identifier payload (v1 hex+base62, or v2 `-`/hex+base62),
// a nested child workflow is `wf_` + 64 hex (sha256 of parent runID + key, see
// runtime.ts). The resume route keeps the strict 26-char form because only
// top-level runs are resumable AND it builds a filesystem path from the id; these
// read routes only do an in-memory runtime map lookup, so the wider (still
// traversal-proof — no `.`/`/`) charset is safe here.
const READ_RUN_ID = /^wf_(?:[0-9A-Za-z-]{26}|[0-9a-f]{64})$/

export const WorkflowRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List workflow runs",
        description:
          "List dynamic-workflow runs for a session. sessionID is REQUIRED — there is no per-user identity, so the session is the access boundary and an omitted/invalid sessionID is a 400 (never an unfiltered all-session listing). Empty when the workflow runtime is not running.",
        operationId: "workflow.list",
        responses: {
          200: {
            description: "Workflow runs",
            content: { "application/json": { schema: resolver(z.array(z.any())) } },
          },
        },
      }),
      validator("query", z.object({ sessionID: Identifier.schema("session") })),
      async (c) =>
        jsonRequest("WorkflowRoutes.list", c, function* () {
          const runtime = workflowRef.current
          if (!runtime) return []
          const query = c.req.valid("query")
          return yield* runtime.list({ sessionID: query.sessionID as SessionID })
        }),
    )
    .post(
      "/graphs/validate",
      describeRoute({
        summary: "Validate a workflow graph",
        description: "Validate editor-generated workflow graph JSON, including topology and Agent references.",
        operationId: "workflow.graph.validate",
        responses: {
          200: {
            description: "Validation result",
            content: {
              "application/json": {
                schema: resolver(z.object({ ok: z.boolean(), errors: z.array(z.string()).optional() })),
              },
            },
          },
        },
      }),
      validator(
        "json",
        z.object({
          graph: z.unknown(),
          teamMemberIds: z.array(z.string()).optional(),
        }),
      ),
      async (c) =>
        jsonRequest("WorkflowRoutes.graph.validate", c, function* () {
          const body = c.req.valid("json")
          const agents = yield* Agent.Service
          const availableAgentIds = (yield* agents.list()).map((agent) => agent.name)
          const result = validateWorkflowGraph(body.graph, {
            teamMemberIds: body.teamMemberIds,
            availableAgentIds,
          })
          return result.ok ? { ok: true } : { ok: false, errors: result.errors }
        }),
    )
    .post(
      "/teams/:teamID/run",
      describeRoute({
        summary: "Run an executable expert team",
        description:
          "Resolve the expert team's execution.graphId, validate and compile its workflow graph JSON, then launch it directly in WorkflowRuntime.",
        operationId: "workflow.team.run",
        responses: {
          200: {
            description: "Started workflow graph run, optionally with a terminal outcome",
            content: { "application/json": { schema: resolver(z.any()) } },
          },
        },
      }),
      validator("param", z.object({ teamID: z.string().regex(/^[A-Za-z][A-Za-z0-9._-]*$/, "invalid team id") })),
      validator(
        "json",
        z.object({
          sessionID: Identifier.schema("session"),
          input: z.unknown().optional(),
          parentActorID: z.string().min(1).default("main"),
          model: z
            .object({
              providerID: ProviderID.zod,
              modelID: ModelID.zod,
            })
            .optional(),
          async: z.boolean().default(true),
        }),
      ),
      async (c) =>
        jsonRequest("WorkflowRoutes.team.run", c, function* () {
          const runtime = workflowRef.current
          if (!runtime) return yield* Effect.fail(new Error("workflow runtime is unavailable"))
          const params = c.req.valid("param")
          const body = c.req.valid("json")
          // WorkflowPersistence keys runs to the session (FK); a missing session
          // would otherwise surface as an opaque 500 FOREIGN KEY error.
          const session = yield* Session.Service
          yield* session.get(body.sessionID as SessionID)
          const agents = yield* Agent.Service
          const availableAgentIds = (yield* agents.list()).map((agent) => agent.name)
          const resolved = yield* Effect.promise(() =>
            resolveExpertTeamWorkflow(params.teamID, Instance.directory, Instance.worktree, availableAgentIds),
          )
          const compiled = compileWorkflowGraph(resolved.graph)
          const started = yield* runtime.start({
            script: compiled.script,
            sessionID: body.sessionID as SessionID,
            parentActorID: body.parentActorID,
            args: body.input ?? {},
            model: body.model,
            workspace: Instance.directory,
            maxConcurrentAgents: resolved.graph.limits?.maxConcurrentAgents ?? 1,
            maxLifecycleAgents: resolved.graph.limits?.maxLifecycleAgents,
            notifyOnTerminal: false,
            // HTTP callers poll status/wait; per-expert actor_notifications
            // would inject user-role messages and trigger extra main-agent turns.
            notifyAgentTerminal: false,
            interactive: false,
          })
          const base = {
            runID: started.runID,
            teamID: resolved.team.id,
            graphID: resolved.graph.id,
            graphVersion: resolved.graph.version,
            graphHash: compiled.graphHash,
          }
          if (body.async) return { ...base, status: "running" }
          const outcome = yield* runtime.wait({ runID: started.runID })
          return { ...base, outcome }
        }),
    )
    .get(
      "/:runID/status",
      validator("param", z.object({ runID: z.string().regex(READ_RUN_ID, "invalid workflow runID") })),
      async (c) =>
        jsonRequest("WorkflowRoutes.status", c, function* () {
          const params = c.req.valid("param")
          const runtime = workflowRef.current
          if (!runtime) return { runID: params.runID, status: "unknown" as const }
          return { runID: params.runID, ...(yield* runtime.status({ runID: params.runID })) }
        }),
    )
    .post(
      "/:runID/wait",
      validator("param", z.object({ runID: z.string().regex(READ_RUN_ID, "invalid workflow runID") })),
      validator("json", z.object({ timeoutMs: z.number().int().positive().max(30_000).default(10_000) })),
      async (c) =>
        jsonRequest("WorkflowRoutes.wait", c, function* () {
          const params = c.req.valid("param")
          const body = c.req.valid("json")
          const runtime = workflowRef.current
          if (!runtime) return { status: "failed" as const, error: "workflow runtime is unavailable" }
          const outcome = yield* runtime.wait({ runID: params.runID, timeoutMs: body.timeoutMs })
          // A long-poll timeout while the run is still going is NOT a failure —
          // report running so HTTP callers keep polling instead of surfacing an
          // error to the user.
          if (outcome.status === "failed" && outcome.error === "workflow wait timed out") {
            const now = yield* runtime.status({ runID: params.runID })
            if (now.status === "running") return { status: "running" as const }
          }
          return outcome
        }),
    )
    .post(
      "/:runID/cancel",
      validator("param", z.object({ runID: z.string().regex(READ_RUN_ID, "invalid workflow runID") })),
      async (c) =>
        jsonRequest("WorkflowRoutes.cancel", c, function* () {
          const params = c.req.valid("param")
          const runtime = workflowRef.current
          if (runtime) yield* runtime.cancel({ runID: params.runID })
          return { runID: params.runID, cancelled: Boolean(runtime) }
        }),
    )
    .post(
      "/:runID/resume",
      describeRoute({
        summary: "Resume a workflow run",
        description:
          "Re-launch a persisted workflow run by id. Returns { runID, resumed }; resumed is false if the run is unknown, still running, or has no persisted script.",
        operationId: "workflow.resume",
        responses: {
          200: {
            description: "Resume result",
            content: {
              "application/json": { schema: resolver(z.object({ runID: z.string(), resumed: z.boolean() })) },
            },
          },
        },
      }),
      validator(
        "param",
        z.object({
          // Strict shape, NOT just startsWith("wf"): runID flows into
          // scriptPath = join(scriptDir, runID + ".js"), so a value like
          // `wf_../../../etc/passwd` (which startsWith "wf") would escape scriptDir.
          // Identifier mints `wf_` + 26 payload chars (`[0-9A-Za-z-]`). This charset
          // has no `.` or `/`, so it is traversal-proof by construction. The `{26}`
          // tracks Identifier.LENGTH — if that constant ever changes, widen this too
          // (the in-depth persistence guard uses `+`, so it stays correct regardless).
          runID: z.string().regex(/^wf_[0-9A-Za-z-]{26}$/, "invalid workflow runID"),
        }),
      ),
      async (c) =>
        jsonRequest("WorkflowRoutes.resume", c, function* () {
          const runtime = workflowRef.current
          const params = c.req.valid("param")
          if (!runtime) return { runID: params.runID, resumed: false }
          return yield* runtime.resume({ runID: params.runID })
        }),
    )
    .get(
      "/:runID/transcript",
      describeRoute({
        summary: "Get a workflow run's full transcript",
        description:
          "Return the complete ordered phase/log transcript for one run, straight from the runtime's in-memory buffer (uncapped, unlike the tool-part metadata copy). Empty when the runtime is down or the run is unknown.",
        operationId: "workflow.transcript",
        responses: {
          200: {
            description: "Full transcript",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    runID: z.string(),
                    transcript: z.array(z.object({ kind: z.enum(["phase", "log"]), text: z.string() })),
                  }),
                ),
              },
            },
          },
        },
      }),
      validator("param", z.object({ runID: z.string().regex(READ_RUN_ID, "invalid workflow runID") })),
      async (c) =>
        jsonRequest("WorkflowRoutes.transcript", c, function* () {
          const runtime = workflowRef.current
          const params = c.req.valid("param")
          if (!runtime) return { runID: params.runID, transcript: [] }
          const transcript = yield* runtime.transcript({ runID: params.runID })
          return { runID: params.runID, transcript: transcript.slice() }
        }),
    )
    .get(
      "/:runID/structure",
      describeRoute({
        summary: "Get a workflow run's structure tree",
        description:
          "Return the observability-only structure tree (phase/agent/workflow nodes with live status) for one run. Empty when the runtime is down or the run is unknown.",
        operationId: "workflow.structure",
        responses: {
          200: {
            description: "Structure tree",
            content: {
              "application/json": {
                schema: resolver(z.object({ runID: z.string(), nodes: z.array(z.any()) })),
              },
            },
          },
        },
      }),
      validator("param", z.object({ runID: z.string().regex(READ_RUN_ID, "invalid workflow runID") })),
      async (c) =>
        jsonRequest("WorkflowRoutes.structure", c, function* () {
          const runtime = workflowRef.current
          const params = c.req.valid("param")
          if (!runtime) return { runID: params.runID, nodes: [] }
          const s = yield* runtime.structure({ runID: params.runID })
          return { runID: params.runID, nodes: s.nodes }
        }),
    ),
)
