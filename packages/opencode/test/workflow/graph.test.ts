import { describe, expect, test } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { compileWorkflowGraph } from "../../src/workflow/graph/compile"
import type { WorkflowGraph } from "../../src/workflow/graph/schema"
import { validateWorkflowGraph } from "../../src/workflow/graph/validate"
import { parseMeta } from "../../src/workflow/meta"
import { evalScript } from "../../src/workflow/sandbox"

const projectRoot = path.resolve(import.meta.dir, "../../../../../")

function testGraph(): WorkflowGraph {
  return {
    id: "strict-order-test",
    version: 1,
    entryNodeId: "start",
    nodes: [
      { id: "start", type: "start" },
      { id: "parameter", type: "agent", agentId: "parameter-agent", prompt: "parameter ${input.request}" },
      {
        id: "calculation",
        type: "agent",
        agentId: "calculation-agent",
        prompt: "calculate",
        input: { parameter: "${nodes.parameter.output}" },
      },
      { id: "gate", type: "condition", expression: { op: "eq", left: "${nodes.calculation.output.passed}", right: true } },
      { id: "report", type: "agent", agentId: "report-agent", prompt: "report ${nodes.calculation.output.value}" },
      { id: "success", type: "end", status: "completed", output: { report: "${nodes.report.output}" } },
      { id: "failed", type: "end", status: "failed", output: { reason: "audit failed" } },
    ],
    edges: [
      { from: "start", to: "parameter" },
      { from: "parameter", to: "calculation" },
      { from: "calculation", to: "gate" },
      { from: "gate", to: "report", branch: true },
      { from: "gate", to: "failed", branch: false },
      { from: "report", to: "success" },
    ],
    limits: { maxSteps: 10, maxConcurrentAgents: 1 },
  }
}

async function executeWithAudit(passed: boolean) {
  const graph = testGraph()
  const { script } = compileWorkflowGraph(graph)
  const parsed = parseMeta(script)
  if (!parsed.ok) throw new Error(parsed.error)
  const calls: string[] = []
  let active = 0
  let maxActive = 0
  const result = await evalScript(
    parsed.body,
    {
      phase: () => undefined,
      log: () => undefined,
      agent: async (_prompt, opts) => {
        const agent = (opts as { agentType: string }).agentType
        calls.push(agent)
        active++
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 2))
        active--
        if (agent === "parameter-agent") return { days: 30 }
        if (agent === "calculation-agent") return { passed, value: 42 }
        return { markdown: "ok" }
      },
    },
    { args: { request: "demo" } },
  )
  return { result: result as Record<string, unknown>, calls, maxActive }
}

describe("workflow graph editor JSON validation", () => {
  test("the expert-team editor generator emits JSON accepted by the runtime validator", async () => {
    const managerModule = pathToFileURL(path.join(projectRoot, "WebPage", "scripts", "expert-manager-api.mjs")).href
    const manager = (await import(managerModule)) as {
      buildLinearWorkflowGraph(input: unknown): unknown
    }
    const graph = manager.buildLinearWorkflowGraph({
      id: "generated-team",
      name: "生成测试专家团",
      description: "由编辑器阶段生成",
      members: [
        { expertId: "parameter-agent", role: "参数" },
        { expertId: "calculation-agent", role: "计算" },
      ],
      workflow: [
        { stage: "1", name: "参数", expertId: "parameter-agent" },
        { stage: "2", name: "计算", expertId: "calculation-agent" },
      ],
    })
    const result = validateWorkflowGraph(graph, {
      teamMemberIds: ["parameter-agent", "calculation-agent"],
      availableAgentIds: ["parameter-agent", "calculation-agent"],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.graph.edges).toEqual([
        { from: "start", to: "stage-1" },
        { from: "stage-1", to: "stage-2" },
        { from: "stage-2", to: "success" },
      ])
      expect(result.graph.limits?.maxConcurrentAgents).toBe(1)
    }
  })

  test("rejects an editor graph with a missing condition branch", () => {
    const graph = testGraph()
    graph.edges = graph.edges.filter((edge) => !(edge.from === "gate" && edge.branch === false))
    const result = validateWorkflowGraph(graph)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join("\n")).toContain("one true branch and one false branch")
  })

  test("rejects cycles and Agent nodes outside the expert team", () => {
    const graph = testGraph()
    graph.edges = graph.edges.map((edge) => (edge.from === "report" ? { from: "report", to: "parameter" } : edge))
    const result = validateWorkflowGraph(graph, { teamMemberIds: ["parameter-agent", "report-agent"] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("contains a cycle")
      expect(result.errors.join("\n")).toContain("outside the expert team")
    }
  })
})

describe("compiled workflow graph execution order", () => {
  test("true branch runs Agents strictly in graph order with no overlap", async () => {
    const { result, calls, maxActive } = await executeWithAudit(true)
    expect(calls).toEqual(["parameter-agent", "calculation-agent", "report-agent"])
    expect(maxActive).toBe(1)
    expect(result.status).toBe("completed")
    expect(result.execution_order).toEqual(["parameter", "calculation", "gate:true", "report"])
  })

  test("false branch is deterministic and never executes the report Agent", async () => {
    const { result, calls, maxActive } = await executeWithAudit(false)
    expect(calls).toEqual(["parameter-agent", "calculation-agent"])
    expect(maxActive).toBe(1)
    expect(result.status).toBe("failed")
    expect(result.execution_order).toEqual(["parameter", "calculation", "gate:false"])
  })

  test("the same graph compiles to the same immutable hash", () => {
    expect(compileWorkflowGraph(testGraph()).graphHash).toBe(compileWorkflowGraph(testGraph()).graphHash)
  })
})
