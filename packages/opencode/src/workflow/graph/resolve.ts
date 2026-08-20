import path from "path"
import { Filesystem } from "@/util"
import { ExecutableExpertTeamSchema, type ExecutableExpertTeam, type WorkflowGraph } from "./schema"
import { validateWorkflowGraph } from "./validate"

const SAFE_ID = /^[A-Za-z][A-Za-z0-9._-]*$/

async function findUp(relativePath: string, start: string, stop: string): Promise<string | null> {
  let current = path.resolve(start)
  const boundary = path.resolve(stop)
  for (;;) {
    const candidate = path.join(current, relativePath)
    if (await Filesystem.exists(candidate)) return candidate
    if (current === boundary) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

export type ResolvedExpertTeamWorkflow = {
  team: ExecutableExpertTeam
  graph: WorkflowGraph
  teamFile: string
  graphFile: string
}

export async function resolveExpertTeamWorkflow(
  teamID: string,
  start: string,
  stop: string,
  availableAgentIds?: Iterable<string>,
): Promise<ResolvedExpertTeamWorkflow> {
  if (!SAFE_ID.test(teamID)) throw new Error(`invalid expert team id: ${JSON.stringify(teamID)}`)
  const teamFile = await findUp(path.join(".mimocode", "agents", "teams", `${teamID}.json`), start, stop)
  if (!teamFile) throw new Error(`expert team '${teamID}' was not found`)

  const rawTeam = await Filesystem.readJson<unknown>(teamFile)
  const teamResult = ExecutableExpertTeamSchema.safeParse(rawTeam)
  if (!teamResult.success) {
    const detail = teamResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new Error(`expert team '${teamID}' is not executable: ${detail}`)
  }
  const team = teamResult.data
  if (team.id !== teamID) throw new Error(`expert team file id '${team.id}' does not match requested id '${teamID}'`)

  const graphID = team.execution.graphId
  const graphFile = await findUp(
    path.join(".mimocode", "workflows", "graphs", `${graphID}.workflow.json`),
    path.dirname(teamFile),
    stop,
  )
  if (!graphFile) throw new Error(`workflow graph '${graphID}' for expert team '${teamID}' was not found`)
  const rawGraph = await Filesystem.readJson<unknown>(graphFile)
  const validation = validateWorkflowGraph(rawGraph, {
    teamMemberIds: team.members.map((member) => member.expertId),
    availableAgentIds,
  })
  if (!validation.ok) {
    throw new Error(`workflow graph '${graphID}' is invalid: ${validation.errors.join("; ")}`)
  }
  if (validation.graph.id !== graphID) {
    throw new Error(`workflow graph file id '${validation.graph.id}' does not match graphId '${graphID}'`)
  }
  return { team, graph: validation.graph, teamFile, graphFile }
}
