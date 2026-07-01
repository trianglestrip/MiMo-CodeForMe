import { tool } from "@mimo-ai/plugin"

const CAD_BASE_URL = process.env.BCAIEP_URL || "http://127.0.0.1:18520"
const CAD_TIMEOUT_MS = 30_000

async function cadFetch(path: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CAD_TIMEOUT_MS)
  try {
    return await fetch(`${CAD_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options?.headers },
    })
  } finally {
    clearTimeout(timer)
  }
}

export const call = tool({
  description: [
    "Execute a single CAD command on the BcAIEP service.",
    "Use GET /api/capabilities first (via cad_capabilities) to discover available methods and their parameter schemas.",
    "The command runs synchronously; write operations are queued to the CAD main thread (15s timeout).",
    "",
    "Example: { method: 'draw_line', params: { x1: 0, y1: 0, z1: 0, x2: 100, y2: 100, z2: 0 } }",
  ].join("\n"),
  args: {
    method: tool.schema.string().describe("Registered command name (e.g. draw_line, get_entity_info, get_layers)"),
    params: tool.schema
      .record(tool.schema.string(), tool.schema.any())
      .optional()
      .describe("Command parameters object; defaults to {}"),
  },
  async execute(args) {
    const body = JSON.stringify({ method: args.method, params: args.params ?? {} })
    const res = await cadFetch("/api/call", { method: "POST", body })
    const json = await res.json()
    if (!res.ok) {
      return { output: `HTTP ${res.status}: ${JSON.stringify(json)}`, metadata: { error: true } }
    }
    return { output: JSON.stringify(json, null, 2), metadata: { type: json.type } }
  },
})

export const batch = tool({
  description: [
    "Execute multiple CAD commands in a single request (ordered, sequential).",
    "Each command in the array has: id (optional), method (required), params (optional).",
    "",
    "Example: { commands: [",
    "  { id: 'step-1', method: 'draw_line', params: { x1: 0, y1: 0, x2: 100, y2: 0 } },",
    "  { id: 'step-2', method: 'draw_line', params: { x1: 100, y1: 0, x2: 100, y2: 100 } }",
    "] }",
  ].join("\n"),
  args: {
    commands: tool.schema
      .array(
        tool.schema.object({
          id: tool.schema.string().optional().describe("Optional identifier for this command"),
          method: tool.schema.string().describe("Command name"),
          params: tool.schema.record(tool.schema.string(), tool.schema.any()).optional().describe("Command parameters"),
        }),
      )
      .describe("Array of commands to execute sequentially"),
  },
  async execute(args) {
    const body = JSON.stringify({ commands: args.commands })
    const res = await cadFetch("/api/batch", { method: "POST", body })
    const json = await res.json()
    if (!res.ok) {
      return { output: `HTTP ${res.status}: ${JSON.stringify(json)}`, metadata: { error: true } }
    }
    return { output: JSON.stringify(json, null, 2), metadata: { type: json.type } }
  },
})

export const capabilities = tool({
  description: [
    "List all registered CAD commands with their parameter JSON Schemas.",
    "Call this to discover what methods are available for cad_call / cad_batch.",
    "Returns { version, generated_by, commands: [{ name, category, description, parameters, ... }] }.",
  ].join("\n"),
  args: {
    category: tool.schema
      .string()
      .optional()
      .describe("Optional category filter (e.g. 'draw', 'query', 'modify') to narrow results"),
  },
  async execute(args) {
    const res = await cadFetch("/api/capabilities")
    const json = await res.json()
    if (!res.ok) {
      return { output: `HTTP ${res.status}: ${JSON.stringify(json)}`, metadata: { error: true } }
    }
    if (args.category && json.commands) {
      json.commands = json.commands.filter(
        (cmd: { category?: string }) => cmd.category?.toLowerCase() === args.category!.toLowerCase(),
      )
    }
    return { output: JSON.stringify(json, null, 2), metadata: { count: json.commands?.length ?? 0 } }
  },
})

export const status = tool({
  description:
    "Check the CAD service runtime status (running state, connected WS clients, registered command count, Qt readiness).",
  args: {},
  async execute() {
    try {
      const res = await cadFetch("/api/status")
      const json = await res.json()
      if (!res.ok) {
        return { output: `CAD service error: HTTP ${res.status}`, metadata: { error: true } }
      }
      return { output: JSON.stringify(json, null, 2), metadata: { server: json.server } }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { output: `CAD service unavailable: ${msg}`, metadata: { error: true } }
    }
  },
})
