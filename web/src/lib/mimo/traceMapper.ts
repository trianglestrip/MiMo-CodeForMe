export type TraceEvent = {
  id: string
  ts: number
  kind: string
  label: string
  status?: string
  sessionID?: string
  messageID?: string
  partID?: string
  callID?: string
  detail?: unknown
  text?: string
}

let seq = 0

const SKIP_TYPES = new Set([
  'server.heartbeat',
  'server.connected',
  'session.updated',
  'message.updated',
  'message.removed',
  'message.part.removed',
  'actor.registered',
  'actor.unregistered',
])

const textBuffers = new Map<string, { kind: string; text: string; meta: Pick<TraceEvent, 'sessionID' | 'messageID' | 'partID'> }>()

export function mapMimoEvent(raw: { type?: string; properties?: Record<string, unknown> }): TraceEvent[] {
  const type = raw.type ?? ''
  const props = raw.properties ?? {}
  if (SKIP_TYPES.has(type)) return []

  if (type === 'message.part.delta') {
    const partID = typeof props.partID === 'string' ? props.partID : undefined
    const delta = props.delta
    if (!partID || delta == null) return []

    const field = typeof props.field === 'string' ? props.field : 'text'
    const kind = field === 'reasoning' ? 'reasoning' : 'text'
    const buf = textBuffers.get(partID) ?? {
      kind,
      text: '',
      meta: {
        sessionID: typeof props.sessionID === 'string' ? props.sessionID : undefined,
        messageID: typeof props.messageID === 'string' ? props.messageID : undefined,
        partID,
      },
    }
    buf.text += String(delta)
    textBuffers.set(partID, buf)

    return [
      ev(buf.kind, kind === 'reasoning' ? '推理中' : '助手回复', undefined, 'streaming', {
        ...buf.meta,
        text: buf.text,
      }),
    ]
  }

  if (type === 'session.created') {
    const info = props.info as Record<string, unknown> | undefined
    const slug = typeof info?.slug === 'string' ? info.slug : undefined
    const sessionID = typeof props.sessionID === 'string' ? props.sessionID : undefined
    return [ev('session', `会话 ${slug ?? sessionID ?? 'new'}`, undefined, undefined, { sessionID })]
  }

  if (type === 'session.error') {
    return [ev('error', 'session error', props.error ?? props, 'error')]
  }

  if (type === 'session.status') {
    const status = props.status as { type?: string } | undefined
    if (status?.type === 'idle') return [ev('session', '本轮完成', undefined, 'completed')]
    return []
  }

  if (type !== 'message.part.updated') return []

  const part = props.part as Record<string, unknown> | undefined
  if (!part) return []

  const sessionID = typeof part.sessionID === 'string' ? part.sessionID : undefined
  const messageID = typeof part.messageID === 'string' ? part.messageID : undefined
  const partID = typeof part.id === 'string' ? part.id : undefined
  const callID = typeof part.callID === 'string' ? part.callID : partID
  const partType = part.type as string | undefined

  if (partType === 'tool') {
    const state = (part.state ?? {}) as Record<string, unknown>
    const tool = typeof part.tool === 'string' ? part.tool : 'tool'
    const status = typeof state.status === 'string' ? state.status : '?'
    const input = state.input as Record<string, unknown> | undefined
    const summary = toolInputSummary(tool, input)
    return [
      ev(
        'tool',
        `${tool}${summary ? ' ' + summary : ''}`,
        { input: state.input, output: state.output, error: state.error },
        status,
        { sessionID, callID },
      ),
    ]
  }

  if (partType === 'step-start') return [ev('step', '→ 模型推理', undefined, undefined, { sessionID, messageID, partID })]
  if (partType === 'step-finish') return [ev('step', '← 推理结束', undefined, undefined, { sessionID, messageID, partID })]

  if (partType === 'text' || partType === 'reasoning') {
    const text = typeof part.text === 'string' ? part.text : ''
    const time = part.time as { end?: number } | undefined
    const done = Boolean(time?.end)
    if (partID) {
      const buf = textBuffers.get(partID)
      if (buf && text.length >= buf.text.length) buf.text = text
      else if (partID) textBuffers.set(partID, { kind: partType, text, meta: { sessionID, messageID, partID } })
      if (done && partID) textBuffers.delete(partID)
    }
    return [
      ev(
        partType,
        partType === 'reasoning' ? '推理' : '助手回复',
        undefined,
        done ? 'completed' : 'streaming',
        { sessionID, messageID, partID, text },
      ),
    ]
  }

  return []
}

function toolInputSummary(tool: string, input?: Record<string, unknown>): string {
  if (!input) return ''
  if (tool === 'read' && typeof input.path === 'string') return input.path
  if ((tool === 'write' || tool === 'edit') && typeof input.path === 'string') return input.path
  if (tool === 'bash' && typeof input.command === 'string') return input.command.split('\n')[0].slice(0, 80)
  if (tool === 'grep' && typeof input.pattern === 'string') return input.pattern
  return ''
}

function ev(
  kind: string,
  label: string,
  detail?: unknown,
  status?: string,
  extra?: Partial<TraceEvent>,
): TraceEvent {
  return {
    id: extra?.partID ? `tr-${extra.partID}` : `tr-${Date.now()}-${++seq}`,
    ts: Date.now(),
    kind,
    label,
    status,
    detail,
    ...extra,
  }
}
