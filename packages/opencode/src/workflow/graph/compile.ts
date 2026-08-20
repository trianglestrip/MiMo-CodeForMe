import { createHash } from "node:crypto"
import type { WorkflowGraph } from "./schema"
import { validateWorkflowGraph } from "./validate"

export type CompiledWorkflowGraph = {
  script: string
  graphHash: string
}

export function compileWorkflowGraph(input: WorkflowGraph): CompiledWorkflowGraph {
  const validation = validateWorkflowGraph(input)
  if (!validation.ok) throw new Error(`cannot compile invalid workflow graph: ${validation.errors.join("; ")}`)
  const graph = validation.graph
  const graphJSON = JSON.stringify(graph)
  const graphHash = createHash("sha256").update(graphJSON).digest("hex")
  const phases = graph.nodes
    .filter((node) => node.type === "agent")
    .map((node) => ({ title: node.phase || node.id, detail: `${node.agentId} (${node.id})` }))
  const meta = {
    name: `graph-${graph.id}-v${graph.version}`,
    description: graph.description || graph.name || `Generated workflow graph ${graph.id}`,
    phases,
  }

  const body = `
const graph = ${graphJSON};
const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
const outgoing = {};
for (const edge of graph.edges) (outgoing[edge.from] ||= []).push(edge);
const context = { input: args && typeof args === "object" ? args : { request: String(args || "") }, nodes: {} };
const executionOrder = [];

function pathValue(path) {
  let value = context;
  for (const part of path.split(".")) {
    if (value === null || value === undefined || typeof value !== "object") return undefined;
    value = value[part];
  }
  return value;
}

function render(value) {
  if (typeof value !== "string") return value;
  const exact = /^\\$\\{([A-Za-z0-9_.-]+)\\}$/.exec(value);
  if (exact) return pathValue(exact[1]);
  return value.replace(/\\$\\{([A-Za-z0-9_.-]+)\\}/g, (_, path) => {
    const resolved = pathValue(path);
    if (resolved === undefined) return "";
    return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}

function resolveValue(value) {
  if (Array.isArray(value)) return value.map(resolveValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item)]));
  }
  return render(value);
}

function evaluate(expression) {
  if (expression.op === "and") return expression.args.every(evaluate);
  if (expression.op === "or") return expression.args.some(evaluate);
  if (expression.op === "not") return !evaluate(expression.arg);
  if (expression.op === "truthy") return Boolean(resolveValue(expression.value));
  const left = resolveValue(expression.left);
  const right = resolveValue(expression.right);
  if (expression.op === "eq") return left === right;
  if (expression.op === "ne") return left !== right;
  if (expression.op === "gt") return left > right;
  if (expression.op === "gte") return left >= right;
  if (expression.op === "lt") return left < right;
  if (expression.op === "lte") return left <= right;
  throw new Error("unsupported condition operator: " + expression.op);
}

let currentId = graph.entryNodeId;
const maxSteps = graph.limits?.maxSteps || graph.nodes.length;
for (let step = 0; step < maxSteps; step++) {
  const node = byId[currentId];
  if (!node) throw new Error("workflow graph entered unknown node: " + currentId);
  const edges = outgoing[currentId] || [];

  if (node.type === "start") {
    currentId = edges[0].to;
    continue;
  }

  if (node.type === "agent") {
    const title = node.phase || node.id;
    phase(title);
    const nodeInput = resolveValue(node.input || {});
    let prompt = render(node.prompt);
    if (Object.keys(nodeInput).length) prompt += "\\n\\n[Workflow Node Input]\\n" + JSON.stringify(nodeInput);
    const opts = { agentType: node.agentId, label: node.id, phase: title };
    if (node.schemaRef) opts.schema = graph.schemas[node.schemaRef];
    if (node.tools) opts.tools = node.tools;
    if (node.model) opts.model = node.model;
    if (node.timeoutMs) opts.timeoutMs = node.timeoutMs;
    if (node.retry) opts.retry = node.retry;
    const output = await agent(prompt, opts);
    executionOrder.push(node.id);
    context.nodes[node.id] = { output };
    if (output === null || output === undefined) {
      return { status: "failed", graph_id: graph.id, graph_version: graph.version, failed_node: node.id, execution_order: executionOrder, reason: "agent returned no deliverable" };
    }
    currentId = edges[0].to;
    continue;
  }

  if (node.type === "condition") {
    const branch = evaluate(node.expression);
    executionOrder.push(node.id + ":" + String(branch));
    const edge = edges.find((candidate) => candidate.branch === branch);
    if (!edge) throw new Error("condition node has no branch for " + String(branch) + ": " + node.id);
    currentId = edge.to;
    continue;
  }

  if (node.type === "end") {
    return {
      status: node.status,
      graph_id: graph.id,
      graph_version: graph.version,
      graph_hash: ${JSON.stringify(graphHash)},
      execution_order: executionOrder,
      output: resolveValue(node.output || {}),
      node_outputs: context.nodes,
    };
  }
}
throw new Error("workflow graph exceeded maxSteps=" + maxSteps);
`

  return { script: `export const meta = ${JSON.stringify(meta, null, 2)}\n${body}`, graphHash }
}
