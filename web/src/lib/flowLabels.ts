import type { ActivityPhase } from '@/lib/partPhase'
export type { ActivityPhase } from '@/lib/partPhase'
export { flowNodeClass } from '@/lib/partPhase'
export { flowMermaidShape, mermaidShapeClass, isCompactMermaidShape } from '@/lib/mermaidShapes'
export type { MermaidFlowShape } from '@/lib/mermaidShapes'

export type FlowNodeCls = ActivityPhase

export function questionLabel(question: string): string {
  const q = question.trim()
  return q || '用户提问'
}

export function activityFlowLabel(phase: FlowNodeCls, label: string, _status: 'done' | 'error' | 'running'): string {
  const text = label.trim()
  if (phase === 'output') return text || '文字输出'
  return text
}
