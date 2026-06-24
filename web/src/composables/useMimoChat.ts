import { ref } from 'vue'
import {
  createSession,
  fetchSessionMessages,
  pollAssistantReply,
  promptAsync,
  userMessageCount,
  waitForMimoReady,
} from '@/lib/mimo/client'
import { mimoConfig } from '@/lib/mimo/config'
import { inlineSnippet, thinkActivityLabel, toolActivityLabel } from '@/lib/mimo/toolLabel'
import { subscribeMimoEvents } from '@/lib/mimo/eventStream'
import { mapMimoEvent, type TraceEvent } from '@/lib/mimo/traceMapper'
import { useChatStore } from '@/stores/chat'

const traceEvents = ref<TraceEvent[]>([])
const connected = ref(false)
const mimoReady = ref(false)

let streamAbort: AbortController | null = null
let streamDirectory: string | null = null
const sessionByConversation = new Map<string, string>()
const activeSessionFilter = ref<string | null>(null)
const assistantTextParts = new Set<string>()

function workDir(): string {
  const dir = mimoConfig().workDir.trim()
  if (!dir) throw new Error('VITE_MIMO_WORK_DIR 未配置')
  return dir
}

function pushTrace(events: TraceEvent[]) {
  for (const e of events) {
    const idx = traceEvents.value.findIndex((x) => x.id === e.id)
    if (idx >= 0) traceEvents.value[idx] = { ...traceEvents.value[idx], ...e }
    else traceEvents.value.push(e)
  }
  if (traceEvents.value.length > 800) {
    traceEvents.value.splice(0, traceEvents.value.length - 800)
  }
}

export function useMimoTrace() {
  return { traceEvents, connected, mimoReady, activeSessionFilter }
}

function eventSessionID(raw: { type?: string; properties?: Record<string, unknown> }): string | undefined {
  if (raw.type === 'message.part.updated') {
    return (raw.properties?.part as Record<string, unknown> | undefined)?.sessionID as string | undefined
  }
  if (raw.type === 'message.part.delta') {
    return raw.properties?.sessionID as string | undefined
  }
  return undefined
}

async function ensureEventStream() {
  const directory = workDir()
  if (streamAbort && streamDirectory === directory) return
  streamAbort?.abort()
  streamAbort = new AbortController()
  streamDirectory = directory
  connected.value = false

  void (async () => {
    while (!streamAbort?.signal.aborted) {
      try {
        await subscribeMimoEvents(
          directory,
          (raw) => {
            connected.value = true
            const mapped = mapMimoEvent(raw)
            const sessionID = eventSessionID(raw)
            pushTrace(mapped)
            handleChatPart(raw, sessionID)
          },
          streamAbort!.signal,
          () => {
            connected.value = true
          },
        )
      } catch {
        connected.value = false
        if (streamAbort?.signal.aborted) return
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  })()
}

function lastAssistantContent(): string {
  const conv = useChatStore().activeConversation()
  if (!conv) return ''
  const last = [...conv.messages].reverse().find((m) => m.role === 'assistant')
  return last?.content?.trim() ?? ''
}

function lastAssistantMessage() {
  const conv = useChatStore().activeConversation()
  if (!conv) return null
  return [...conv.messages].reverse().find((m) => m.role === 'assistant') ?? null
}

function handleChatPart(raw: { type?: string; properties?: Record<string, unknown> }, sessionID?: string) {
  const chat = useChatStore()
  const conv = chat.activeConversation()
  if (!conv) return
  if (sessionID && sessionByConversation.get(conv.id) !== sessionID) return

  if (raw.type === 'message.part.delta') {
    const props = raw.properties ?? {}
    const partID = typeof props.partID === 'string' ? props.partID : undefined
    const delta = props.delta
    const field = props.field
    if (field === 'reasoning') {
      const key = partID ?? 'think'
      if (delta != null) {
        const last = lastAssistantMessage()
        if (last) {
          last.reasoning = `${last.reasoning ?? ''}${String(delta)}`
          chat.pushAssistantActivity({
            key,
            phase: 'think',
            label: thinkActivityLabel(last.reasoning),
            status: 'running',
          })
        }
      }
      return
    }
    if (!partID || delta == null || props.field !== 'text') return
    if (!assistantTextParts.has(partID)) return
    chat.appendToLastAssistant(String(delta))
    const preview = inlineSnippet(lastAssistantContent())
    chat.pushAssistantActivity({
      key: partID,
      phase: 'output',
      label: preview ? `输出 · ${preview}` : '文字输出…',
      status: 'running',
    })
    return
  }

  if (raw.type !== 'message.part.updated') return

  const part = raw.properties?.part as Record<string, unknown> | undefined
  if (!part) return

  if (part.type === 'reasoning') {
    const text = typeof part.text === 'string' ? part.text : ''
    const partID = typeof part.id === 'string' ? part.id : 'think'
    chat.pushAssistantActivity({
      key: partID,
      phase: 'think',
      label: thinkActivityLabel(text),
      status: 'running',
    })
    if (!text) return
    const last = lastAssistantMessage()
    if (last && text.length >= (last.reasoning?.length ?? 0)) {
      last.reasoning = text
      conv.updatedAt = Date.now()
    }
    return
  }

  if (part.type === 'tool') {
    const tool = typeof part.tool === 'string' ? part.tool : 'tool'
    const callID = typeof part.callID === 'string' ? part.callID : typeof part.id === 'string' ? part.id : tool
    const state = (part.state ?? {}) as Record<string, unknown>
    const status = typeof state.status === 'string' ? state.status : 'pending'
    const label = toolActivityLabel(tool, state.input as Record<string, unknown> | undefined)
    if (status === 'running' || status === 'pending') {
      chat.pushAssistantActivity({ key: callID, phase: 'tool', label: `调用 ${label}`, status: 'running' })
    } else if (status === 'error') {
      chat.pushAssistantActivity({ key: callID, phase: 'tool', label: `调用 ${label} · 失败`, status: 'error' })
    } else {
      chat.pushAssistantActivity({ key: callID, phase: 'tool', label: `调用 ${label} · 完成`, status: 'done' })
    }
    return
  }

  if (part.type !== 'text') return
  const partID = typeof part.id === 'string' ? part.id : undefined
  if (partID) assistantTextParts.add(partID)
  const text = typeof part.text === 'string' ? part.text : ''
  if (text) {
    chat.pushAssistantActivity({
      key: partID ?? 'output',
      phase: 'output',
      label: `输出 · ${inlineSnippet(text)}`,
      status: 'running',
    })
    chat.setLastAssistantContent(text)
  }
}

const SESSION_MAP_KEY = 'mimo-web-session-map'

function persistSessionLink(conversationId: string, sessionId: string, title: string) {
  try {
    const raw = localStorage.getItem(SESSION_MAP_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, { sessionId: string; title: string; updatedAt: number }>) : {}
    map[conversationId] = { sessionId, title, updatedAt: Date.now() }
    localStorage.setItem(SESSION_MAP_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

async function ensureSession(conversationId: string): Promise<string> {
  const existing = sessionByConversation.get(conversationId)
  if (existing) return existing
  await waitForMimoReady()
  mimoReady.value = true
  const session = await createSession(workDir())
  sessionByConversation.set(conversationId, session.id)
  activeSessionFilter.value = session.id
  const conv = useChatStore().activeConversation()
  persistSessionLink(conversationId, session.id, conv?.title ?? '新对话')
  pushTrace([
    {
      id: `tr-${Date.now()}`,
      ts: Date.now(),
      kind: 'session',
      label: `session ${session.id}`,
      sessionID: session.id,
      detail: session,
    },
  ])
  return session.id
}

export async function sendViaMimo(userContent: string): Promise<void> {
  const chat = useChatStore()
  const conv = chat.activeConversation()
  if (!conv) throw new Error('No active conversation')

  const directory = workDir()
  void ensureEventStream()
  chat.pushAssistantActivity({ key: 'wait', phase: 'think', label: '等待 MiMo 响应…', status: 'running' })
  const sessionID = await ensureSession(conv.id)
  assistantTextParts.clear()

  try {
    const before = await fetchSessionMessages(sessionID, directory)
    const usersBefore = userMessageCount(before)
    await promptAsync(sessionID, userContent, directory)
    const text = await pollAssistantReply(sessionID, directory, usersBefore)
    if (text) chat.setLastAssistantContent(text)
    if (!lastAssistantContent()) {
      throw new Error('未收到 MiMo 回复，请新建对话后重试')
    }
    persistSessionLink(conv.id, sessionID, conv.title)
  } catch (e) {
    sessionByConversation.delete(conv.id)
    throw e
  } finally {
    chat.finishAssistantActivities()
  }
}

export async function checkMimoStatus(): Promise<boolean> {
  try {
    await waitForMimoReady(3000)
    mimoReady.value = true
    return true
  } catch {
    mimoReady.value = false
    return false
  }
}

export function startMimoTraceBackground() {
  if (mimoConfig().workDir) {
    void ensureEventStream()
    void checkMimoStatus()
  }
}
