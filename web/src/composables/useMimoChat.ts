import { ref } from 'vue'
import {
  createSession,
  promptAsync,
  waitForMimoReady,
} from '@/lib/mimo/client'
import { getWorkDir, WORK_DIR_CHANGED } from '@/lib/workDir'
import { inlineSnippet, thinkActivityLabel } from '@/lib/mimo/toolLabel'
import { subscribeMimoEvents } from '@/lib/mimo/eventStream'
import { mapMimoEvent, type TraceEvent } from '@/lib/mimo/traceMapper'
import { usageFromMessageInfo } from '@/lib/mimo/tokens'
import {
  partActivityFromUpdate,
  registerPartKind,
  resolveDeltaKind,
} from '@/lib/partPhase'
import { useChatStore } from '@/stores/chat'
import { waitTurnEnd } from '@/composables/turn/useTurnLifecycle'
import type { MessageAttachment } from '@/lib/composer/attachments'
import type { PollResult } from '@/lib/mimo/poll'
import { persistSessionLinkAsync } from '@/lib/sessionMap'

const traceEvents = ref<TraceEvent[]>([])
const connected = ref(false)
const mimoReady = ref(false)

let streamAbort: AbortController | null = null
let streamDirectory: string | null = null
const sessionByConversation = new Map<string, string>()
const activeSessionFilter = ref<string | null>(null)
const assistantTextParts = new Set<string>()
const partKinds = new Map<string, string>()
const messageRoles = new Map<string, string>()
let turnAcceptUpdates = true

type TurnFinishListener = (sessionID: string, info: Record<string, unknown>) => void
const turnFinishListeners = new Set<TurnFinishListener>()

export function onTurnFinish(listener: TurnFinishListener) {
  turnFinishListeners.add(listener)
  return () => turnFinishListeners.delete(listener)
}

export function workDirForTurn(): string {
  const dir = getWorkDir().trim()
  if (!dir) throw new Error('请先在顶部设置工作目录')
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
  if (raw.type === 'message.updated') {
    return (raw.properties?.info as Record<string, unknown> | undefined)?.sessionID as string | undefined
  }
  return undefined
}

async function ensureEventStream() {
  const directory = workDirForTurn()
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
            if (raw.type === 'message.updated') {
              handleMessageUpdated(raw, sessionID)
              return
            }
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

function applyAssistantUsage(info: Record<string, unknown>) {
  const usage = usageFromMessageInfo(info)
  if (!usage) return
  const last = lastAssistantMessage()
  if (!last) return
  last.usage = usage
  useChatStore().persist()
}

function notifyTurnFinish(sessionID: string | undefined, info: Record<string, unknown>) {
  if (!sessionID || !info.finish) return
  for (const listener of turnFinishListeners) listener(sessionID, info)
}

function handleMessageUpdated(raw: { type?: string; properties?: Record<string, unknown> }, sessionID?: string) {
  const chat = useChatStore()
  const conv = chat.activeConversation()
  if (!conv) return
  if (sessionID && sessionByConversation.get(conv.id) !== sessionID) return
  const info = raw.properties?.info as Record<string, unknown> | undefined
  if (!info) return
  if (typeof info.id === 'string' && typeof info.role === 'string') {
    messageRoles.set(info.id, info.role)
  }
  if (info.role !== 'assistant') return
  applyAssistantUsage(info)
  notifyTurnFinish(sessionID, info)
}

function pushPartActivity(part: Record<string, unknown>) {
  const chat = useChatStore()
  const role = typeof part.messageID === 'string' ? messageRoles.get(part.messageID) : undefined
  const activity = partActivityFromUpdate(part, role)
  if (!activity) return
  chat.pushAssistantActivity(activity)
}

function handleChatPart(raw: { type?: string; properties?: Record<string, unknown> }, sessionID?: string) {
  if (raw.type === 'message.updated') {
    handleMessageUpdated(raw, sessionID)
    return
  }
  const chat = useChatStore()
  const conv = chat.activeConversation()
  if (!conv) return
  if (sessionID && sessionByConversation.get(conv.id) !== sessionID) return
  if (!turnAcceptUpdates) return

  if (raw.type === 'message.part.delta') {
    const props = raw.properties ?? {}
    const partID = typeof props.partID === 'string' ? props.partID : undefined
    const delta = props.delta
    const field = typeof props.field === 'string' ? props.field : undefined
    if (!partID || delta == null) return

    const kind = resolveDeltaKind(partKinds, partID, field)
    if (kind === 'reasoning') {
      const last = lastAssistantMessage()
      if (last) {
        last.reasoning = `${last.reasoning ?? ''}${String(delta)}`
        chat.pushAssistantActivity({
          key: `reasoning:${partID}`,
          phase: 'think',
          label: thinkActivityLabel(last.reasoning),
          status: 'running',
        })
        conv.updatedAt = Date.now()
      }
      return
    }

    if (kind !== 'text' || !assistantTextParts.has(partID)) return
    chat.appendToLastAssistant(String(delta))
    const preview = inlineSnippet(lastAssistantContent())
    chat.pushAssistantActivity({
      key: `text:${partID}`,
      phase: 'output',
      label: preview ? `输出 · ${preview}` : '文字输出…',
      status: 'running',
    })
    return
  }

  if (raw.type !== 'message.part.updated') return

  const part = raw.properties?.part as Record<string, unknown> | undefined
  if (!part) return

  registerPartKind(partKinds, part)

  if (part.type === 'text') {
    const partID = typeof part.id === 'string' ? part.id : undefined
    const role = typeof part.messageID === 'string' ? messageRoles.get(part.messageID) : undefined
    if (partID && role !== 'user') assistantTextParts.add(partID)
    const text = typeof part.text === 'string' ? part.text : ''
    if (text && role !== 'user') chat.setLastAssistantContent(text)
  }

  if (part.type === 'reasoning') {
    const text = typeof part.text === 'string' ? part.text : ''
    const last = lastAssistantMessage()
    if (last && text.length >= (last.reasoning?.length ?? 0)) {
      last.reasoning = text
      conv.updatedAt = Date.now()
    }
  }

  pushPartActivity(part)
}

export function persistSessionLinkForConv(
  conversationId: string,
  sessionId: string,
  title: string,
) {
  void persistSessionLinkAsync(conversationId, sessionId, title)
}

export async function ensureSession(conversationId: string): Promise<string> {
  const existing = sessionByConversation.get(conversationId)
  if (existing) return existing
  await waitForMimoReady()
  mimoReady.value = true
  const session = await createSession(workDirForTurn())
  sessionByConversation.set(conversationId, session.id)
  activeSessionFilter.value = session.id
  const conv = useChatStore().activeConversation()
  void persistSessionLinkAsync(conversationId, session.id, conv?.title ?? '新对话')
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

export async function runTurn(
  sessionID: string,
  userContent: string,
  usersBefore: number,
  signal?: AbortSignal,
  attachments: MessageAttachment[] = [],
): Promise<PollResult> {
  const directory = workDirForTurn()
  void ensureEventStream()
  turnAcceptUpdates = true
  assistantTextParts.clear()
  partKinds.clear()
  await promptAsync(sessionID, userContent, directory, attachments)
  return waitTurnEnd(sessionID, directory, usersBefore, signal)
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
  void ensureEventStream()
  void checkMimoStatus()
  if (typeof window !== 'undefined') {
    window.addEventListener(WORK_DIR_CHANGED, () => {
      streamDirectory = null
      void ensureEventStream()
    })
  }
}
