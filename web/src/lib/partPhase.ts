import { inlineSnippet, thinkActivityLabel, toolActivityLabel } from '@/lib/mimo/toolLabel'

export type ActivityPhase =
  | 'think'
  | 'tool'
  | 'output'
  | 'step'
  | 'file'
  | 'delegate'
  | 'system'

const PART_TO_PHASE: Record<string, ActivityPhase> = {
  reasoning: 'think',
  tool: 'tool',
  text: 'output',
  'step-start': 'step',
  'step-finish': 'step',
  file: 'file',
  snapshot: 'file',
  patch: 'file',
  agent: 'delegate',
  subtask: 'delegate',
  compaction: 'system',
  checkpoint: 'system',
  retry: 'system',
}

const STREAM_PART_TYPES = new Set(['reasoning', 'text'])

export function partTypeToPhase(partType: string): ActivityPhase {
  return PART_TO_PHASE[partType] ?? 'system'
}

export function phaseTag(phase: ActivityPhase): string {
  if (phase === 'think') return '思考'
  if (phase === 'tool') return '调用'
  if (phase === 'output') return '输出'
  if (phase === 'step') return '步骤'
  if (phase === 'file') return '文件'
  if (phase === 'delegate') return '委派'
  return '系统'
}

export function registerPartKind(map: Map<string, string>, part: Record<string, unknown>) {
  const id = part.id
  const type = part.type
  if (typeof id !== 'string' || typeof type !== 'string') return
  if (STREAM_PART_TYPES.has(type) || type in PART_TO_PHASE) map.set(id, type)
}

export function resolveDeltaKind(map: Map<string, string>, partID: string, field?: string): string {
  return map.get(partID) ?? (field === 'reasoning' ? 'reasoning' : 'text')
}

export function flowNodeClass(phase: ActivityPhase, subOk?: boolean): string {
  if (phase === 'tool') return subOk === false ? 'node-tool-err' : 'node-tool'
  return `node-${phase}`
}

export function partStepKey(part: Record<string, unknown>): string {
  const type = String(part.type ?? 'part')
  if (type === 'tool') return `tool:${part.callID ?? part.id ?? type}`
  return `${type}:${part.id ?? type}`
}

export function toolActivityStatus(state: Record<string, unknown>): 'running' | 'done' | 'error' {
  const status = typeof state.status === 'string' ? state.status : 'pending'
  if (status === 'error') return 'error'
  if (status === 'completed') return 'done'
  return 'running'
}

export function partActivityFromUpdate(
  part: Record<string, unknown>,
  messageRole?: string,
): { key: string; phase: ActivityPhase; label: string; status: 'running' | 'done' | 'error' } | null {
  const type = String(part.type ?? '')
  const key = partStepKey(part)

  if (type === 'reasoning') {
    const text = typeof part.text === 'string' ? part.text : ''
    const time = part.time as { end?: number } | undefined
    return {
      key,
      phase: 'think',
      label: thinkActivityLabel(text),
      status: time?.end ? 'done' : 'running',
    }
  }

  if (type === 'tool') {
    const tool = typeof part.tool === 'string' ? part.tool : 'tool'
    const state = (part.state ?? {}) as Record<string, unknown>
    const status = toolActivityStatus(state)
    const detail = toolActivityLabel(tool, state.input as Record<string, unknown> | undefined)
    const label = `调用 ${detail}`
    if (status === 'error') return { key, phase: 'tool', label: `${label} · 失败`, status: 'error' }
    if (status === 'done') return { key, phase: 'tool', label: `${label} · 完成`, status: 'done' }
    return { key, phase: 'tool', label, status: 'running' }
  }

  if (type === 'text') {
    if (messageRole === 'user') return null
    const text = typeof part.text === 'string' ? part.text : ''
    const time = part.time as { end?: number } | undefined
    return {
      key,
      phase: 'output',
      label: text ? `输出 · ${inlineSnippet(text)}` : '文字输出…',
      status: time?.end ? 'done' : 'running',
    }
  }

  if (type === 'step-start') {
    return { key, phase: 'step', label: '模型推理开始', status: 'done' }
  }

  if (type === 'step-finish') {
    const tokens = part.tokens as { total?: number; output?: number } | undefined
    const total = tokens?.total ?? tokens?.output
    const suffix = total != null ? ` · ${total} tokens` : ''
    return { key, phase: 'step', label: `推理轮次完成${suffix}`, status: 'done' }
  }

  if (type === 'file') {
    const name = typeof part.filename === 'string' ? part.filename : typeof part.mime === 'string' ? part.mime : '附件'
    return { key, phase: 'file', label: `文件 · ${name}`, status: 'done' }
  }

  if (type === 'snapshot') {
    return { key, phase: 'file', label: '工作区快照', status: 'done' }
  }

  if (type === 'patch') {
    const files = Array.isArray(part.files) ? part.files.length : 0
    return { key, phase: 'file', label: files ? `变更 · ${files} 个文件` : '文件变更', status: 'done' }
  }

  if (type === 'agent') {
    const name = typeof part.name === 'string' ? part.name : 'agent'
    return { key, phase: 'delegate', label: `Agent · ${name}`, status: 'done' }
  }

  if (type === 'subtask') {
    const agent = typeof part.agent === 'string' ? part.agent : 'subtask'
    const desc = typeof part.description === 'string' ? inlineSnippet(part.description, 60) : ''
    return { key, phase: 'delegate', label: desc ? `子任务 · ${agent} · ${desc}` : `子任务 · ${agent}`, status: 'done' }
  }

  if (type === 'compaction') {
    return { key, phase: 'system', label: '上下文压缩', status: 'done' }
  }

  if (type === 'checkpoint') {
    return { key, phase: 'system', label: '会话检查点', status: 'done' }
  }

  if (type === 'retry') {
    const attempt = typeof part.attempt === 'number' ? part.attempt : '?'
    return { key, phase: 'system', label: `API 重试 · 第 ${attempt} 次`, status: 'error' }
  }

  return null
}

export function traceStepFromPart(part: Record<string, unknown>): {
  key: string
  cls: ActivityPhase
  tag: string
  title: string
  done: boolean
} | null {
  const activity = partActivityFromUpdate(part, 'assistant')
  if (!activity) return null
  return {
    key: activity.key,
    cls: activity.phase,
    tag: phaseTag(activity.phase),
    title: activity.label,
    done: activity.status !== 'running',
  }
}
