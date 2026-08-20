import z from "zod"

const SafeID = z.string().regex(/^[A-Za-z][A-Za-z0-9._-]*$/, "must be a safe identifier")

export type WorkflowExpression =
  | { op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; left: unknown; right: unknown }
  | { op: "and" | "or"; args: WorkflowExpression[] }
  | { op: "not"; arg: WorkflowExpression }
  | { op: "truthy"; value: unknown }

export const WorkflowExpressionSchema: z.ZodType<WorkflowExpression> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.strictObject({ op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]), left: z.unknown(), right: z.unknown() }),
    z.strictObject({ op: z.enum(["and", "or"]), args: z.array(WorkflowExpressionSchema).min(1) }),
    z.strictObject({ op: z.literal("not"), arg: WorkflowExpressionSchema }),
    z.strictObject({ op: z.literal("truthy"), value: z.unknown() }),
  ]),
)

const StartNode = z.strictObject({
  id: SafeID,
  type: z.literal("start"),
})

const AgentNode = z.strictObject({
  id: SafeID,
  type: z.literal("agent"),
  agentId: SafeID,
  phase: z.string().min(1).optional(),
  prompt: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  schemaRef: SafeID.optional(),
  tools: z.array(z.string().min(1)).optional(),
  model: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().max(3_600_000).optional(),
  retry: z
    .strictObject({
      attempts: z.number().int().min(1).max(5),
      baseMs: z.number().int().min(0).max(60_000).optional(),
      maxMs: z.number().int().min(0).max(300_000).optional(),
    })
    .optional(),
})

const ConditionNode = z.strictObject({
  id: SafeID,
  type: z.literal("condition"),
  expression: WorkflowExpressionSchema,
})

const EndNode = z.strictObject({
  id: SafeID,
  type: z.literal("end"),
  status: z.enum(["completed", "failed"]),
  output: z.unknown().optional(),
})

export const WorkflowNodeSchema = z.discriminatedUnion("type", [StartNode, AgentNode, ConditionNode, EndNode])

export const WorkflowEdgeSchema = z.strictObject({
  from: SafeID,
  to: SafeID,
  branch: z.boolean().optional(),
})

export const WorkflowGraphSchema = z.strictObject({
  $schema: z.string().optional(),
  id: SafeID,
  version: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  generator: z.string().min(1).optional(),
  entryNodeId: SafeID,
  schemas: z.record(SafeID, z.record(z.string(), z.unknown())).optional(),
  nodes: z.array(WorkflowNodeSchema).min(2).max(256),
  edges: z.array(WorkflowEdgeSchema).min(1).max(1024),
  limits: z
    .strictObject({
      maxSteps: z.number().int().min(2).max(4096),
      maxConcurrentAgents: z.number().int().min(1).max(64).default(1),
      maxLifecycleAgents: z.number().int().min(1).max(1000).optional(),
    })
    .optional(),
})

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>

export const ExpertTeamExecutionSchema = z.strictObject({
  type: z.literal("workflow-graph"),
  graphId: SafeID,
  inputMapping: z.record(z.string(), z.unknown()).optional(),
})

export const ExecutableExpertTeamSchema = z
  .object({
    id: SafeID,
    type: z.literal("expert-team"),
    members: z.array(z.object({ expertId: SafeID, role: z.string().optional() })).min(1),
    execution: ExpertTeamExecutionSchema,
  })
  .passthrough()

export type ExecutableExpertTeam = z.infer<typeof ExecutableExpertTeamSchema>
