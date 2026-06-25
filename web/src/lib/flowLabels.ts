export type FlowNodeCls = 'think' | 'tool' | 'output'

export function questionLabel(question: string): string {
  const q = question.trim()
  return q || '用户提问'
}

export function flowNodeClass(cls: FlowNodeCls, subOk?: boolean): string {
  if (cls === 'think') return 'node-think'
  if (cls === 'tool') return subOk === false ? 'node-tool-err' : 'node-tool'
  return 'node-output'
}

export function activityFlowLabel(phase: FlowNodeCls, label: string, status: 'done' | 'error' | 'running'): string {
  const text = label.trim()
  if (phase === 'think') return `💭 ${text}`
  if (phase === 'tool') {
    const mark = status === 'error' ? ' ✗' : status === 'done' ? ' ✓' : ''
    return `🔧 ${text}${mark}`
  }
  return `✍️ ${text || '文字输出'}`
}
