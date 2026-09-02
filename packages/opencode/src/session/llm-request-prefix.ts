import { Effect } from "effect"
import { tool, jsonSchema, type Tool as AITool } from "ai"
import z from "zod"
import { MessageV2 } from "./message-v2"
import type { SessionID } from "./schema"
import type { Agent } from "../agent/agent"
import type { Provider } from "../provider"
import type { JSONSchema7 } from "@ai-sdk/provider"
import { LLM } from "./llm"
import { ToolRegistry } from "../tool"
import type * as Tool from "../tool/tool"
import { GPT_TOP_LEVEL_TOOLS } from "../tool/tool-script-ref"
import { usesGPTToolset } from "../tool/gpt"
import { ProviderTransform } from "../provider"
import type { PromptConfig } from "./session"

/**
 * Per-runLoop-iteration memoization carrier shared by SessionPrompt.resolveTools
 * and buildLLMRequestPrefix. resolveTools fills it while resolving the full
 * registry defs (registered()); the later buildLLMRequestPrefix call in the same
 * step reuses those defs and the already-transformed JSON schemas instead of
 * re-running definitions() (per-tool plugin triggers + describe rebuilds) and
 * zod→JSONSchema a second time. Lifetime is ONE step: the tool registry can be
 * reloaded mid-run (extension write → registry.reload()), so caching across
 * steps would serve stale tool sets.
 */
export interface PrefixToolCache {
  /** Full registry defs (includeHidden) resolved earlier in the same step. */
  registeredDefs?: Tool.Def[]
  /** Provider-transformed JSON schema per tool id, from the same step. */
  schemas?: Map<string, JSONSchema7>
}

/**
 * Build the LLM request prefix (system + tools + inheritedMessages) from the
 * given msgs array. Given identical inputs this returns deep-equal output
 * (modulo plugin trigger determinism, which is the only external non-determinism
 * source).
 *
 * Used by:
 *   - parent runLoop, to construct its own request
 *   - tryStartCheckpointWriter, to capture a frozen ForkContext at spawn time
 *
 * Both call sites must use this same function — the byte-equal invariant
 * across parent and fork is a structural consequence, not a separate assertion.
 * Exception: the parent runLoop sets `collapseCheckpointTail: true` so the model
 * sees a rebuild-tail activity log instead of hollow tool pairs; the checkpoint
 * writer leaves it off so it still writes from full-fidelity history. When a
 * prior checkpoint exists, parent/writer inheritedMessages therefore diverge by
 * design (checkpoint quality beats prefix-cache parity on the rebuild path).
 *
 * Slicing (e.g. for fork capture at a watermark) is a caller concern; callers
 * pass the already-sliced msgs. ForkContext.watermarkMsgID is a boundary marker
 * on the fork context, not a parameter here.
 */
export const buildLLMRequestPrefix = Effect.fn("Session.buildLLMRequestPrefix")(function* (input: {
  sessionID: SessionID
  agent: Agent.Info
  model: Provider.Model
  msgs: MessageV2.WithParts[]
  /**
   * Caller-built system-tail parts. Currently environment/format, skill reminder,
   * then instruction files. Caller is responsible for the ordering and content.
   */
  additions: string[]
  /** Frozen Session/Fork system; bypasses all system regeneration when present. */
  prebuiltSystem?: string[]
  prompt?: PromptConfig
  /**
   * Collapse post-checkpoint rebuild tails into an activity log. Enable for the
   * main-agent runLoop; leave off for checkpoint-writer fork capture so the
   * writer still sees full-fidelity recent history.
   */
  collapseCheckpointTail?: boolean
  /** Same-step memoization carrier filled by resolveTools. See PrefixToolCache. */
  toolCache?: PrefixToolCache
}) {
  const llm = yield* LLM.Service
  const toolRegistry = yield* ToolRegistry.Service

  // Always use full msgs — slicing is a fork-capture concern that lives at the
  // caller (ForkContext.watermarkMsgID is a boundary marker, not a slice arg).
  // See spec changelog at docs/superpowers/specs/2026-05-26-fork-agent-prefix-cache-design.md
  const inheritedMessages = yield* MessageV2.toModelMessagesEffect(input.msgs, input.model, {
    collapseCheckpointTail: input.collapseCheckpointTail,
  })

  // Find the last user message; required for system "user.system" pass-through
  const lastUserMsg = input.msgs.findLast((m) => m.info.role === "user")
  if (!lastUserMsg)
    return yield* Effect.die(new Error("buildLLMRequestPrefix: no user message in msgs"))
  const lastUser = input.prompt
    ? {
        ...(lastUserMsg.info as MessageV2.User),
        system: input.prompt.system,
        systemMode: input.prompt.systemMode,
        harness: input.prompt.harness,
      }
    : (lastUserMsg.info as MessageV2.User)

  // Build system using LLM.buildSystemArray (single source of truth shared with stream())
  const system =
    input.prebuiltSystem ??
    (yield* llm.buildSystemArray({
      agent: input.agent,
      model: input.model,
      system: input.additions,
      user: lastUser,
      sessionID: input.sessionID as string,
      agentID: lastUser.agentID,
    }))

  // Resolve tools using parent agent's permission and toolAllowlist. When the
  // same-step cache from resolveTools is available AND the GPT-toolset gate
  // agrees between both call sites (tools() is called without apiModelID/family,
  // registered() with them), reuse the cached defs — they are byte-identical to
  // what tools() would return. On any gate disagreement fall back to the real
  // tools() call: the two filtered sets may genuinely differ.
  const gptReduced = usesGPTToolset(input.model.id, lastUser.harness)
  const gptFull = usesGPTToolset(input.model.id, lastUser.harness, input.model.api.id, input.model.family)
  const cachedDefs =
    input.toolCache?.registeredDefs && gptReduced === gptFull
      ? gptReduced
        ? input.toolCache.registeredDefs.filter((item) => GPT_TOP_LEVEL_TOOLS.has(item.id))
        : input.toolCache.registeredDefs
      : undefined
  const toolDefs =
    cachedDefs ??
    (yield* toolRegistry.tools({
      modelID: input.model.id,
      providerID: input.model.providerID,
      agent: input.agent,
      harness: lastUser.harness,
    }))
  const tools: Record<string, AITool> = {}
  const debugToolDefs: { id: string; description: string; parameters?: unknown }[] = []
  for (const item of toolDefs) {
    let schema = input.toolCache?.schemas?.get(item.id)
    if (!schema) {
      schema = ProviderTransform.schema(input.model, z.toJSONSchema(item.parameters))
      input.toolCache?.schemas?.set(item.id, schema)
    }
    tools[item.id] = tool({
      description: item.description,
      inputSchema: jsonSchema(schema),
    })
    debugToolDefs.push({ id: item.id, description: item.description, parameters: schema })
  }

  return { system, tools, inheritedMessages, debugToolDefs }
})
