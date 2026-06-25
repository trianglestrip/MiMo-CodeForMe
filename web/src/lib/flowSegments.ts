import { activityFlowLabel } from '@/lib/flowLabels'
import { flowMermaidShape, isCompactMermaidShape } from '@/lib/mermaidShapes'
import { flowCompactLines } from '@/lib/flowCompactLabels'
import type { ActivityStep } from '@/stores/chat'

export type FlowStepView = {
  key: string
  cls: ActivityStep['phase']
  label: string
  status: ActivityStep['status']
  subOk: boolean | undefined
  mermaidShape: ReturnType<typeof flowMermaidShape>
  compactLines: [string, string] | null
  shapeDashed: boolean
}

export type FlowRoundSegment = {
  kind: 'round'
  round: number
  steps: FlowStepView[]
}

export type FlowNodeSegment = {
  kind: 'node'
  step: FlowStepView
}

export type FlowSegment = FlowRoundSegment | FlowNodeSegment

function isStepStartKey(key: string) {
  return key.startsWith('step-start:')
}

function isStepFinishKey(key: string) {
  return key.startsWith('step-finish:')
}

export function mapActivityToFlowStep(a: ActivityStep): FlowStepView {
  const mermaidShape = flowMermaidShape(a.phase, a.key, a.label)
  return {
    key: a.key,
    cls: a.phase,
    label: activityFlowLabel(a.phase, a.label, a.status),
    status: a.status,
    subOk: a.phase === 'tool' ? a.status !== 'error' : undefined,
    mermaidShape,
    compactLines: isCompactMermaidShape(mermaidShape)
      ? flowCompactLines(mermaidShape, a.key, a.label)
      : null,
    shapeDashed: a.phase === 'system' && mermaidShape === 'rounded',
  }
}

/** 推理轮次用灰色虚线方框包裹；step-start / step-finish 不再单独成节点 */
export function buildFlowSegments(steps: FlowStepView[]): FlowSegment[] {
  const segments: FlowSegment[] = []
  let round = 0
  let roundSteps: FlowStepView[] | null = null

  const flushRound = () => {
    if (!roundSteps?.length) {
      roundSteps = null
      return
    }
    segments.push({ kind: 'round', round, steps: roundSteps })
    roundSteps = null
  }

  for (const step of steps) {
    if (isStepStartKey(step.key)) {
      flushRound()
      round += 1
      roundSteps = []
      continue
    }
    if (isStepFinishKey(step.key)) {
      flushRound()
      continue
    }
    if (roundSteps) roundSteps.push(step)
    else segments.push({ kind: 'node', step })
  }

  flushRound()
  return segments
}

export function visibleFlowSteps(activities: ActivityStep[], active?: boolean): FlowStepView[] {
  return activities
    .filter((a) => !(a.key === 'wait' && a.status === 'done'))
    .filter(
      (a) =>
        a.status === 'done' ||
        a.status === 'error' ||
        (active && a.status === 'running'),
    )
    .map(mapActivityToFlowStep)
}
