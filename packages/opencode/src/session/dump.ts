import fs from "fs/promises"
import path from "path"
import { Effect } from "effect"
import z from "zod"
import { Config } from "@/config"
import { Instance } from "@/project/instance"
import { Session } from "@/session"
import { Agent } from "@/agent/agent"
import { Provider } from "@/provider"
import { ProviderTransform } from "@/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { ToolRegistry } from "@/tool"
import { NamedError } from "@mimo-ai/shared/util/error"
import { buildLLMRequestPrefix } from "./llm-request-prefix"
import { Instruction } from "./instruction"
import { LLM } from "./llm"
import type { MessageV2 } from "./message-v2"
import type { SessionID } from "./schema"
import { SystemPrompt } from "./system"

export namespace ContextDump {
  export const DisabledError = NamedError.create(
    "ContextDumpDisabledError",
    z.object({
      message: z.string(),
    }),
  )

  export const Info = z.object({
    sessionID: z.string(),
    agent: z.string(),
    model: z.object({
      providerID: z.string(),
      modelID: z.string(),
    }),
    system: z.array(z.string()),
    additions: z.array(z.string()),
    messages: z.array(z.unknown()),
    tools: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        parameters: z.unknown(),
      }),
    ),
    dumpedAt: z.number(),
    path: z.string().optional(),
  })
  export type Info = z.infer<typeof Info>

  export const assemble = Effect.fn("ContextDump.assemble")(function* (input: {
    sessionID: SessionID
    agentID?: string
  }) {
    const cfg = yield* Config.Service
    const config = yield* cfg.get()
    if (!config.experimental?.dump_context) {
      return yield* Effect.fail(
        new DisabledError({
          message: "Context dump is disabled. Set experimental.dump_context to true in mimocode.json.",
        }),
      )
    }

    const sessions = yield* Session.Service
    const agents = yield* Agent.Service
    const providers = yield* Provider.Service
    const sys = yield* SystemPrompt.Service
    const instruction = yield* Instruction.Service
    const llm = yield* LLM.Service
    const registry = yield* ToolRegistry.Service

    const session = yield* sessions.get(input.sessionID)
    const agentID = input.agentID ?? "main"
    const msgs = yield* sessions.messages({ sessionID: input.sessionID, agentID })

    const lastUserMsg = msgs.findLast((m) => m.info.role === "user")
    if (!lastUserMsg) {
      return yield* Effect.die(new Error("ContextDump: no user message in session"))
    }
    const lastUser = lastUserMsg.info as MessageV2.User

    const agentName = lastUser.agent || (yield* agents.defaultAgent())
    const agent = yield* agents.get(agentName)
    if (!agent) {
      return yield* Effect.die(new Error(`ContextDump: agent not found: ${agentName}`))
    }

    const model = yield* providers.getModel(
      ProviderID.make(lastUser.model.providerID),
      ModelID.make(lastUser.model.modelID),
    )

    const [skills, env, instructions] = yield* Effect.all([
      sys.skills(agent),
      Effect.sync(() => sys.environment(model, session.time.created)),
      instruction.system().pipe(Effect.orDie),
    ])

    const additions = [...env, ...(skills ? [skills] : []), ...instructions.content]

    const prefix = yield* buildLLMRequestPrefix({
      sessionID: input.sessionID,
      agent,
      model,
      msgs,
      additions,
    }).pipe(
      Effect.provideService(LLM.Service, llm),
      Effect.provideService(ToolRegistry.Service, registry),
    )

    const toolDefs = yield* registry.tools({
      modelID: ModelID.make(model.api.id),
      providerID: model.providerID,
      agent,
    })
    const tools = toolDefs.map((t) => ({
      id: t.id,
      description: t.description,
      parameters: ProviderTransform.schema(model, z.toJSONSchema(t.parameters)),
    }))

    return {
      sessionID: input.sessionID,
      agent: agentName,
      model: {
        providerID: model.providerID,
        modelID: model.id,
      },
      system: prefix.system,
      additions,
      messages: prefix.inheritedMessages,
      tools,
      dumpedAt: Date.now(),
    } satisfies Omit<Info, "path">
  })

  function formatText(data: Omit<Info, "path">): string {
    const lines: string[] = [
      `# Context dump`,
      ``,
      `session: ${data.sessionID}`,
      `agent: ${data.agent}`,
      `model: ${data.model.providerID}/${data.model.modelID}`,
      `dumpedAt: ${new Date(data.dumpedAt).toISOString()}`,
      ``,
      `## System (${data.system.length} parts)`,
      ...data.system.map((part, i) => [`### system[${i}]`, part, ``].join("\n")),
      ``,
      `## Additions (${data.additions.length})`,
      ...data.additions.map((part, i) => [`### addition[${i}]`, part, ``].join("\n")),
      ``,
      `## Messages (${data.messages.length})`,
      JSON.stringify(data.messages, null, 2),
      ``,
      `## Tools (${data.tools.length})`,
      JSON.stringify(data.tools, null, 2),
    ]
    return lines.join("\n")
  }

  export const write = Effect.fn("ContextDump.write")(function* (input: {
    sessionID: SessionID
    agentID?: string
    format?: "json" | "text"
  }) {
    const data = yield* assemble(input)
    const dir = path.join(Instance.directory, ".mimocode", "dumps", input.sessionID)
    yield* Effect.promise(() => fs.mkdir(dir, { recursive: true }))
    const stamp = new Date(data.dumpedAt).toISOString().replace(/[:.]/g, "-")
    const format = input.format ?? "json"
    const file =
      format === "text"
        ? path.join(dir, `context-${stamp}.txt`)
        : path.join(dir, `context-${stamp}.json`)
    const body = format === "text" ? formatText(data) : JSON.stringify(data, null, 2)
    yield* Effect.promise(() => fs.writeFile(file, body, "utf-8"))
    return { ...data, path: file } satisfies Info
  })
}
