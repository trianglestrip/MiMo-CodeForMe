import { computed, reactive, ref, shallowRef } from 'vue'
import { phaseTag, registerPartKind, resolveDeltaKind, traceStepFromPart } from '@/lib/partPhase'
import { SKIP_EVENT_TYPES } from './constants'
import { formatToolDisplay } from './toolDisplay'
import type { MimoBusEvent, SessionMessage, TimelineSnapshot, TraceSession, TraceStep, TraceTurn } from './types'
import { fmtTime, preview, sessionPageUrl, shortSessionId } from './utils'

interface SessionRuntime {
  userMessages: Set<string>
  messageRoles: Map<string, string>
  partKinds: Map<string, string>
  currentTurn: TraceTurn | null
  stepIndex: Map<string, TraceStep>
}

interface DeltaBatch {
  ses: TraceSession
  stepKey: string
  cls: TraceStep['cls']
  tag: string
  title: string
  text: string
}

export function createTraceEngine(getWorkDir: () => string) {
  const sessions = shallowRef<TraceSession[]>([])
  const activeSessionID = ref<string | null>(
    typeof window !== 'undefined' ? new URLSearchParams(location.search).get('session') : null,
  )
  const runtimeById = new Map<string, SessionRuntime>()
  const pendingDeltas = new Map<string, DeltaBatch>()
  let deltaRaf: number | null = null

  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  const activeSession = computed(() => {
    if (!activeSessionID.value) return null
    return sessions.value.find((s) => s.id === activeSessionID.value) ?? null
  })

  function runtime(ses: TraceSession): SessionRuntime {
    let rt = runtimeById.get(ses.id)
    if (!rt) {
      rt = {
        userMessages: new Set(),
        messageRoles: new Map(),
        partKinds: new Map(),
        currentTurn: null,
        stepIndex: new Map(),
      }
      runtimeById.set(ses.id, rt)
    }
    return rt
  }

  function isActiveSession(sessionID: string) {
    return sessionID === activeSessionID.value
  }

  function touchSession(ses: TraceSession) {
    ses.updatedAt = Date.now()
  }

  function getSession(sessionID?: string | null): TraceSession {
    const id = sessionID || '_unknown'
    let ses = sessions.value.find((s) => s.id === id)
    if (!ses) {
      ses = reactive({
        id,
        title: '新对话',
        shortId: shortSessionId(id),
        turns: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        loaded: false,
        timeline: [],
      }) as TraceSession
      sessions.value = [...sessions.value, ses]
    }
    return ses
  }

  function finishTurn(ses: TraceSession) {
    const rt = runtime(ses)
    if (!rt.currentTurn) return
    rt.currentTurn.active = false
    rt.currentTurn.done = true
    rt.currentTurn = null
    rt.stepIndex.clear()
  }

  function startTurn(ses: TraceSession, question: string) {
    finishTurn(ses)
    ses.turns += 1
    touchSession(ses)
    const turn = reactive({
      id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      question,
      time: fmtTime(Date.now()),
      active: true,
      done: false,
      steps: [] as TraceStep[],
    }) as TraceTurn
    runtime(ses).currentTurn = turn
    ses.timeline.push(turn)
  }

  function ensureTurn(ses: TraceSession): TraceTurn {
    const rt = runtime(ses)
    if (rt.currentTurn) return rt.currentTurn
    startTurn(ses, '（未捕获问题）')
    return runtime(ses).currentTurn!
  }

  function upsertStep(
    ses: TraceSession,
    key: string,
    cls: TraceStep['cls'],
    tag: string,
    title: string,
    opts: {
      title?: string
      intent?: string
      inputLine?: string
      append?: string
      text?: string
      done?: boolean
      sub?: string
      subOk?: boolean
    } = {},
  ) {
    if (!isActiveSession(ses.id)) return
    const turn = ensureTurn(ses)
    const rt = runtime(ses)
    let step = rt.stepIndex.get(key)
    if (!step) {
      step = reactive({
        key,
        num: turn.steps.length + 1,
        cls,
        tag,
        title,
        text: '',
        live: false,
        done: false,
      }) as TraceStep
      turn.steps.push(step)
      rt.stepIndex.set(key, step)
    }

    if (opts.title != null) step.title = opts.title
    if (opts.intent) step.intent = opts.intent
    if (opts.inputLine) step.inputLine = opts.inputLine

    if (opts.append) {
      step.text += opts.append
      if (!step.done) step.live = true
    }
    if (opts.text != null && opts.text.length >= step.text.length) {
      step.text = opts.text
    }

    if (opts.sub) {
      step.sub = opts.sub
      if (opts.subOk === true) step.subOk = true
      if (opts.subOk === false) step.subOk = false
    }

    if (opts.done) {
      step.done = true
      step.live = false
      if (!step.text.trim()) step.text = ''
      else if (cls === 'think' || cls === 'output') step.title = preview(step.text, 80)
    }
  }

  function flushPendingDeltas() {
    deltaRaf = null
    for (const item of pendingDeltas.values()) {
      upsertStep(item.ses, item.stepKey, item.cls, item.tag, item.title, { append: item.text })
    }
    pendingDeltas.clear()
  }

  function queueDelta(
    ses: TraceSession,
    stepKey: string,
    cls: TraceStep['cls'],
    tag: string,
    title: string,
    chunk: string,
  ) {
    const key = `${ses.id}:${stepKey}`
    const item = pendingDeltas.get(key) || { ses, stepKey, cls, tag, title, text: '' }
    item.text += chunk
    pendingDeltas.set(key, item)
    if (!deltaRaf) deltaRaf = requestAnimationFrame(flushPendingDeltas)
  }

  function registerPartKindLocal(ses: TraceSession, part: Record<string, unknown>) {
    registerPartKind(runtime(ses).partKinds, part)
  }

  function handleDelta(ses: TraceSession, props: Record<string, unknown>) {
    if (!isActiveSession(ses.id)) return
    const partID = props.partID
    const delta = props.delta
    if (typeof partID !== 'string' || delta == null) return
    touchSession(ses)
    const kind = resolveDeltaKind(
      runtime(ses).partKinds,
      partID,
      typeof props.field === 'string' ? props.field : undefined,
    )
    if (kind === 'reasoning') {
      queueDelta(ses, `think:${partID}`, 'think', phaseTag('think'), preview(String(delta), 80), String(delta))
      return
    }
    queueDelta(ses, `out:${partID}`, 'output', phaseTag('output'), preview(String(delta), 80) || '…', String(delta))
  }

  function handleGenericPart(ses: TraceSession, part: Record<string, unknown>) {
    if (!isActiveSession(ses.id)) return
    touchSession(ses)
    const mapped = traceStepFromPart(part)
    if (!mapped) return
    const text = typeof part.text === 'string' ? part.text : ''
    const time = part.time as { end?: number } | undefined
    const done = mapped.done || Boolean(time?.end)
    if (part.type === 'reasoning' || part.type === 'text') {
      upsertStep(ses, mapped.key, mapped.cls, mapped.tag, mapped.title, { text, done })
      return
    }
    upsertStep(ses, mapped.key, mapped.cls, mapped.tag, mapped.title, { done })
  }

  function handleTool(ses: TraceSession, part: Record<string, unknown>) {
    if (!isActiveSession(ses.id)) return
    touchSession(ses)
    const callID = part.callID || part.id
    if (!callID) return
    const state = (part.state || {}) as Record<string, unknown>
    const status = String(state.status || 'pending')
    const tool = String(part.tool || 'tool')
    const display = formatToolDisplay(tool, state.input as Record<string, unknown>, state, getWorkDir())
    const stepOpts = {
      title: display.title,
      intent: display.intent,
      inputLine: display.inputLine,
      done: status === 'completed' || status === 'error',
      sub: status === 'running' ? '执行中…' : display.sub,
      subOk: status === 'completed' || status === 'error' ? display.ok : undefined,
      text: status === 'completed' || status === 'error' ? display.text || undefined : undefined,
    }
    upsertStep(ses, `tool:${callID}`, 'tool', phaseTag('tool'), display.title, stepOpts)
  }

  function handleUserText(ses: TraceSession, messageID: string, text: string) {
    if (!messageID || !text.trim() || runtime(ses).userMessages.has(messageID)) return
    runtime(ses).userMessages.add(messageID)
    const q = text.trim()
    if (!ses.title || ses.title === '新对话') {
      ses.title = q.length > 36 ? `${q.slice(0, 36)}…` : q
    }
    touchSession(ses)
    if (!isActiveSession(ses.id)) return
    finishTurn(ses)
    startTurn(ses, q)
  }

  function eventSessionID(raw: MimoBusEvent, part: Record<string, unknown>): string {
    if (part.sessionID) return String(part.sessionID)
    const p = raw.properties || {}
    if (p.sessionID) return String(p.sessionID)
    if (part.messageID) {
      for (const ses of sessions.value) {
        if (runtime(ses).messageRoles.has(String(part.messageID))) return ses.id
      }
    }
    return activeSessionID.value || '_unknown'
  }

  function extractUserText(info: Record<string, unknown>): string {
    const parts = info.parts
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (p?.type === 'text' && typeof p.text === 'string' && p.text.trim()) return p.text.trim()
      }
    }
    if (typeof info.content === 'string' && info.content.trim()) return info.content.trim()
    if (typeof info.text === 'string' && info.text.trim()) return info.text.trim()
    return ''
  }

  function handleEvent(raw: MimoBusEvent) {
    const type = raw.type || ''
    if (SKIP_EVENT_TYPES.has(type)) return

    if (type === 'session.created') {
      const sid = raw.properties?.sessionID || (raw.properties?.info as { id?: string })?.id
      if (sid) touchSession(getSession(String(sid)))
      return
    }

    if (type === 'message.part.delta') {
      const props = raw.properties || {}
      handleDelta(getSession(String(props.sessionID)), props)
      return
    }

    if (type === 'session.error') {
      const sid = raw.properties?.sessionID
      const ses = getSession(sid ? String(sid) : null)
      if (!isActiveSession(ses.id)) return
      upsertStep(ses, `err:${Date.now()}`, 'system', phaseTag('system'), String(raw.properties?.error || 'session error'), {
        done: true,
        subOk: false,
        sub: String(raw.properties?.error || 'session error'),
      })
      return
    }

    if (type === 'session.status') {
      const sid = raw.properties?.sessionID
      const st =
        (raw.properties?.status as { type?: string })?.type || (raw.properties?.type as string)
      if (st === 'idle' && sid && isActiveSession(String(sid))) finishTurn(getSession(String(sid)))
      return
    }

    if (type === 'message.part.updated') {
      const part = (raw.properties?.part || {}) as Record<string, unknown>
      const ses = getSession(eventSessionID(raw, part))
      registerPartKindLocal(ses, part)
      const role = part.messageID ? runtime(ses).messageRoles.get(String(part.messageID)) : undefined
      if (part.type === 'tool') {
        handleTool(ses, part)
        return
      }
      if (part.type === 'text' && role === 'user') {
        handleUserText(ses, String(part.messageID), typeof part.text === 'string' ? part.text : '')
        return
      }
      handleGenericPart(ses, part)
      return
    }

    if (type === 'message.updated') {
      const info = (raw.properties?.info || {}) as Record<string, unknown>
      const sid = info.sessionID || raw.properties?.sessionID
      const ses = getSession(sid ? String(sid) : null)
      if (info.id && info.role) runtime(ses).messageRoles.set(String(info.id), String(info.role))
      if (info.role === 'user') {
        const text = extractUserText(info)
        if (text) handleUserText(ses, String(info.id), text)
      }
    }
  }

  function replaySessionMessages(sessionID: string, messages: SessionMessage[]) {
    const ses = getSession(sessionID)
    for (const msg of messages) {
      const role = msg.info?.role
      if (role === 'user') {
        finishTurn(ses)
        const text = (msg.parts ?? []).find((p) => p.type === 'text' && p.text)?.text?.trim()
        if (!text) continue
        if (!ses.title || ses.title === '新对话') {
          ses.title = text.length > 36 ? `${text.slice(0, 36)}…` : text
        }
        startTurn(ses, text)
        if (msg.info?.id) runtime(ses).userMessages.add(msg.info.id)
      }
      if (role === 'assistant') {
        if (msg.info?.id) runtime(ses).messageRoles.set(msg.info.id, 'assistant')
        if (!runtime(ses).currentTurn) startTurn(ses, '（历史回放）')
        for (const part of msg.parts ?? []) {
          if (part.type === 'tool') handleTool(ses, part as Record<string, unknown>)
          else handleGenericPart(ses, { ...part, time: part.time ?? { end: Date.now() } })
        }
        finishTurn(ses)
      }
    }
    ses.loaded = true
  }

  function syncFromStorageMap(map: Record<string, { sessionId?: string; title?: string; updatedAt?: number; createdAt?: number }>) {
    let changed = false
    const entries = Object.values(map).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    for (const entry of entries) {
      if (!entry?.sessionId) continue
      const existed = sessions.value.some((s) => s.id === entry.sessionId)
      const ses = getSession(entry.sessionId)
      if (!existed) changed = true
      if (entry.title && entry.title !== ses.title) {
        ses.title = entry.title
        changed = true
      }
      if (entry.createdAt && (entry.createdAt < ses.createdAt || existed === false)) {
        ses.createdAt = entry.createdAt
        changed = true
      }
      if (!entry.createdAt && entry.updatedAt && !existed) {
        ses.createdAt = entry.updatedAt
        changed = true
      }
      if (entry.updatedAt && entry.updatedAt > ses.updatedAt) {
        ses.updatedAt = entry.updatedAt
        changed = true
      }
    }
    if (changed) sessions.value = [...sessions.value]
  }

  function latestSessionIdFromStorage(): string | null {
    try {
      const map = JSON.parse(localStorage.getItem('mimo-web-session-map') || '{}') as Record<
        string,
        { sessionId?: string; updatedAt?: number }
      >
      const entries = Object.values(map).filter((e) => e?.sessionId)
      entries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      return entries[0]?.sessionId ?? null
    } catch {
      return null
    }
  }

  async function loadSession(sessionID: string | null) {
    activeSessionID.value = sessionID
    if (!sessionID) return
    const ses = getSession(sessionID)
    if (ses.loaded && ses.timeline.length) return
    if (ses.timeline.length) {
      ses.loaded = true
      return
    }
  }

  function navigateToSession(sessionID: string) {
    if (sessionID === activeSessionID.value) return
    if (typeof window !== 'undefined') {
      history.pushState({ session: sessionID }, '', sessionPageUrl(sessionID))
    }
    activeSessionID.value = sessionID
  }

  function setActiveSession(sessionID: string | null) {
    activeSessionID.value = sessionID
  }

  function getSnapshot(): TimelineSnapshot[] {
    return sessions.value
      .filter((s) => s.timeline.length)
      .map((s) => ({
        session: s.id,
        turns: s.timeline.map((t) => ({ question: t.question, done: t.done })),
      }))
  }

  function mockEvents(): MimoBusEvent[] {
    const ses = 'ses_sim001'
    const msgUser = 'msg_user001'
    const msgAsst = 'msg_asst001'
    const prtThink = 'prt_think001'
    const prtTool = 'prt_tool001'
    const prtOut = 'prt_out001'
    const callID = 'call_read001'
    return [
      {
        type: 'message.updated',
        properties: {
          info: {
            id: msgUser,
            role: 'user',
            sessionID: ses,
            parts: [{ type: 'text', text: '当前目录有哪些文件' }],
          },
        },
      },
      {
        type: 'message.part.updated',
        properties: {
          part: {
            id: prtThink,
            type: 'reasoning',
            messageID: msgAsst,
            sessionID: ses,
            text: '需要先列出工作区目录。',
            time: { end: Date.now() },
          },
        },
      },
      {
        type: 'message.part.updated',
        properties: {
          part: {
            id: prtTool,
            type: 'tool',
            callID,
            tool: 'read',
            messageID: msgAsst,
            sessionID: ses,
            state: { status: 'running', input: { path: '.' } },
          },
        },
      },
      {
        type: 'message.part.updated',
        properties: {
          part: {
            id: prtTool,
            type: 'tool',
            callID,
            tool: 'read',
            messageID: msgAsst,
            sessionID: ses,
            state: {
              status: 'completed',
              input: { path: '.' },
              output:
                '<path>D:\\\\proj</path> <type>directory</type> <entries> packages/ web/ README.md </entries>',
            },
          },
        },
      },
      {
        type: 'message.part.updated',
        properties: {
          part: {
            id: prtOut,
            type: 'text',
            messageID: msgAsst,
            sessionID: ses,
            text: '当前目录包含 packages、web、README.md 等。',
            time: { end: Date.now() },
          },
        },
      },
      { type: 'session.status', properties: { sessionID: ses, status: { type: 'idle' } } },
    ]
  }

  function runSimulation() {
    activeSessionID.value = 'ses_sim001'
    getSession('ses_sim001')
    for (const e of mockEvents()) handleEvent(e)
    return getSnapshot()
  }

  return {
    sessions,
    sortedSessions,
    activeSessionID,
    activeSession,
    getSession,
    handleEvent,
    replaySessionMessages,
    syncFromStorageMap,
    latestSessionIdFromStorage,
    loadSession,
    navigateToSession,
    setActiveSession,
    getSnapshot,
    runSimulation,
    mockEvents,
  }
}

export type TraceEngine = ReturnType<typeof createTraceEngine>
