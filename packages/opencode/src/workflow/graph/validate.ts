import type { WorkflowGraph, WorkflowNode } from "./schema"
import { WorkflowGraphSchema } from "./schema"

export type GraphValidationResult =
  | { ok: true; graph: WorkflowGraph }
  | { ok: false; errors: string[] }

function nodeLabel(node: WorkflowNode): string {
  return `${node.type} node '${node.id}'`
}

export function validateWorkflowGraph(
  input: unknown,
  options: { teamMemberIds?: Iterable<string>; availableAgentIds?: Iterable<string> } = {},
): GraphValidationResult {
  const parsed = WorkflowGraphSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "graph"}: ${issue.message}`),
    }
  }

  const graph = parsed.data
  const errors: string[] = []
  const byID = new Map<string, WorkflowNode>()
  for (const node of graph.nodes) {
    if (byID.has(node.id)) errors.push(`duplicate node id '${node.id}'`)
    byID.set(node.id, node)
  }

  const starts = graph.nodes.filter((node) => node.type === "start")
  if (starts.length !== 1) errors.push(`graph must contain exactly one start node; found ${starts.length}`)
  if (starts[0]?.id !== graph.entryNodeId) {
    errors.push(`entryNodeId '${graph.entryNodeId}' must identify the single start node`)
  }

  const outgoing = new Map<string, typeof graph.edges>()
  const incoming = new Map<string, typeof graph.edges>()
  for (const edge of graph.edges) {
    if (!byID.has(edge.from)) errors.push(`edge source '${edge.from}' does not exist`)
    if (!byID.has(edge.to)) errors.push(`edge target '${edge.to}' does not exist`)
    const out = outgoing.get(edge.from) ?? []
    out.push(edge)
    outgoing.set(edge.from, out)
    const inc = incoming.get(edge.to) ?? []
    inc.push(edge)
    incoming.set(edge.to, inc)
  }

  const memberIDs = options.teamMemberIds ? new Set(options.teamMemberIds) : undefined
  const availableIDs = options.availableAgentIds ? new Set(options.availableAgentIds) : undefined
  for (const node of graph.nodes) {
    const out = outgoing.get(node.id) ?? []
    if (node.type === "end") {
      if (out.length) errors.push(`${nodeLabel(node)} must not have outgoing edges`)
      continue
    }
    if (node.type === "condition") {
      if (out.length !== 2 || !out.some((edge) => edge.branch === true) || !out.some((edge) => edge.branch === false)) {
        errors.push(`${nodeLabel(node)} must have exactly one true branch and one false branch`)
      }
      if (out.some((edge) => edge.branch === undefined)) {
        errors.push(`${nodeLabel(node)} edges must declare a boolean branch`)
      }
    } else {
      if (out.length !== 1) errors.push(`${nodeLabel(node)} must have exactly one outgoing edge`)
      if (out.some((edge) => edge.branch !== undefined)) {
        errors.push(`${nodeLabel(node)} cannot use conditional branches`)
      }
    }
    if (node.type === "agent") {
      if (memberIDs && !memberIDs.has(node.agentId)) {
        errors.push(`${nodeLabel(node)} references agent '${node.agentId}' outside the expert team`)
      }
      if (availableIDs && !availableIDs.has(node.agentId)) {
        errors.push(`${nodeLabel(node)} references unknown agent '${node.agentId}'`)
      }
      if (node.schemaRef && !graph.schemas?.[node.schemaRef]) {
        errors.push(`${nodeLabel(node)} references missing schema '${node.schemaRef}'`)
      }
    }
  }

  if (graph.limits && graph.limits.maxSteps < graph.nodes.length) {
    errors.push(`limits.maxSteps (${graph.limits.maxSteps}) must be at least the node count (${graph.nodes.length})`)
  }

  const reachable = new Set<string>()
  const visitReachable = (id: string) => {
    if (reachable.has(id) || !byID.has(id)) return
    reachable.add(id)
    for (const edge of outgoing.get(id) ?? []) visitReachable(edge.to)
  }
  visitReachable(graph.entryNodeId)
  for (const node of graph.nodes) {
    if (!reachable.has(node.id)) errors.push(`${nodeLabel(node)} is unreachable from entryNodeId`)
  }

  const canReachEnd = new Set(graph.nodes.filter((node) => node.type === "end").map((node) => node.id))
  const queue = [...canReachEnd]
  while (queue.length) {
    const id = queue.shift()!
    for (const edge of incoming.get(id) ?? []) {
      if (!canReachEnd.has(edge.from)) {
        canReachEnd.add(edge.from)
        queue.push(edge.from)
      }
    }
  }
  for (const node of graph.nodes) {
    if (!canReachEnd.has(node.id)) errors.push(`${nodeLabel(node)} cannot reach an end node`)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const findCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const edge of outgoing.get(id) ?? []) {
      if (findCycle(edge.to)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }
  if (findCycle(graph.entryNodeId)) errors.push("graph contains a cycle; MVP workflow graphs must be acyclic")

  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, graph }
}
