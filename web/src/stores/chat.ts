import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageAttachment } from '@/lib/composer/attachments'
import type { ActivityPhase } from '@/lib/partPhase'
import { flushWriteJson, scheduleWriteJson } from '@/lib/asyncLocalStorage'
import { CHAT_STORAGE_KEY, ensureChatInit } from '@/stores/chatInit'

export type { ActivityPhase } from '@/lib/partPhase'

export interface ToolCallPayload {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ActivityStatus = 'running' | 'done' | 'error'

export interface ActivityStep {
  id: string
  key: string
  phase: ActivityPhase
  label: string
  status: ActivityStatus
}

export type StopReason = 'idle_early' | 'timeout' | 'aborted' | 'error'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** @deprecated 旧版仅存图片 data URL，新消息请用 attachments */
  images?: string[]
  attachments?: MessageAttachment[]
  reasoning?: string
  activities?: ActivityStep[]
  createdAt: number
  completedAt?: number
  durationMs?: number
  usage?: { total: number; input: number; output: number }
  model?: string
  toolCalls?: ToolCallPayload[]
  stopReason?: StopReason
  incomplete?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const LOCAL_CONV_KEY = CHAT_STORAGE_KEY
const PERSIST_DEBOUNCE_MS = 400

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const activeId = ref<string | null>(null)
  const streaming = ref(false)
  const error = ref<string | null>(null)
  const listLoaded = ref(false)
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  function ensureInit() {
    return ensureChatInit()
  }

  /** @deprecated 使用 ensureInit；保留兼容 */
  async function init() {
    await ensureInit()
  }

  function persistNow() {
    return flushWriteJson(LOCAL_CONV_KEY, conversations.value)
  }

  function flushPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    void persistNow()
  }

  function schedulePersist() {
    if (!streaming.value) {
      flushPersist()
      return
    }
    if (persistTimer) return
    persistTimer = setTimeout(() => {
      persistTimer = null
      void scheduleWriteJson(LOCAL_CONV_KEY, conversations.value)
    }, PERSIST_DEBOUNCE_MS)
  }

  const activeConversation = () =>
    conversations.value.find(c => c.id === activeId.value) ?? null

  async function newConversation() {
    const now = Date.now()
    const conv: Conversation = {
      id: genId(),
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    conversations.value.unshift(conv)
    activeId.value = conv.id
    await persistNow()
    return conv
  }

  async function deleteConversation(id: string) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id ?? null
      if (conversations.value.length === 0) await newConversation()
    }
    await persistNow()
  }

  function selectConversation(id: string) {
    activeId.value = id
  }

  async function addMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const conv = activeConversation()
    if (!conv) return null

    const m: ChatMessage = {
      ...msg,
      id: genId(),
      createdAt: Date.now(),
    }
    conv.messages.push(m)
    conv.updatedAt = m.createdAt
    if (conv.messages.filter(x => x.role === 'user').length === 1 && msg.role === 'user') {
      conv.title = msg.content.slice(0, 40) + (msg.content.length > 40 ? '…' : '')
    }
    void scheduleWriteJson(LOCAL_CONV_KEY, conversations.value)
    return m
  }

  function lastAssistant() {
    const conv = activeConversation()
    if (!conv) return null
    return [...conv.messages].reverse().find((m) => m.role === 'assistant') ?? null
  }

  function pushAssistantActivity(step: {
    key: string
    phase: ActivityPhase
    label: string
    status: ActivityStatus
  }) {
    const last = lastAssistant()
    if (!last) return
    if (!last.activities) last.activities = []
    const idx = last.activities.findIndex((a) => a.key === step.key)
    if (idx >= 0) {
      last.activities[idx].label = step.label
      last.activities[idx].status = step.status
      last.activities[idx].phase = step.phase
    } else {
      for (const a of last.activities) {
        if (a.status === 'running') a.status = 'done'
      }
      last.activities.push({
        id: genId(),
        key: step.key,
        phase: step.phase,
        label: step.label,
        status: step.status,
      })
    }
    const conv = activeConversation()
    if (conv) conv.updatedAt = Date.now()
    schedulePersist()
  }

  function finishAssistantActivities() {
    const last = lastAssistant()
    if (!last?.activities?.length) return
    for (const a of last.activities) {
      if (a.status === 'running') a.status = 'done'
    }
    flushPersist()
  }

  function completeLastAssistant(meta?: {
    usage?: ChatMessage['usage']
    stopReason?: StopReason
    incomplete?: boolean
  }) {
    const last = lastAssistant()
    if (!last) return
    const now = Date.now()
    last.completedAt = now
    last.durationMs = now - last.createdAt
    if (meta?.usage) last.usage = meta.usage
    if (meta?.stopReason) last.stopReason = meta.stopReason
    if (meta?.incomplete !== undefined) last.incomplete = meta.incomplete
    const conv = activeConversation()
    if (conv) conv.updatedAt = now
    flushPersist()
  }

  function setLastAssistantContent(text: string) {
    const conv = activeConversation()
    if (!conv) return
    const last = lastAssistant()
    if (last) {
      last.content = text
      for (const a of last.activities ?? []) {
        if (a.phase === 'output' && a.status === 'running') a.status = 'done'
      }
      conv.updatedAt = Date.now()
      schedulePersist()
    }
  }

  function appendToLastAssistant(text: string) {
    const conv = activeConversation()
    if (!conv) return
    const last = [...conv.messages].reverse().find(m => m.role === 'assistant')
    if (last) {
      last.content += text
      conv.updatedAt = Date.now()
      schedulePersist()
    }
  }

  async function persist() {
    await persistNow()
  }

  async function removeLastAssistantIfEmpty() {
    const conv = activeConversation()
    if (!conv) return
    const last = conv.messages.at(-1)
    if (
      last?.role === 'assistant' &&
      !last.content.trim() &&
      !(last.reasoning?.trim()) &&
      !last.activities?.length &&
      !last.toolCalls?.length
    ) {
      conv.messages.pop()
      void scheduleWriteJson(LOCAL_CONV_KEY, conversations.value)
    }
  }

  return {
    conversations,
    activeId,
    streaming,
    error,
    listLoaded,
    ensureInit,
    init,
    activeConversation,
    newConversation,
    deleteConversation,
    selectConversation,
    addMessage,
    appendToLastAssistant,
    pushAssistantActivity,
    finishAssistantActivities,
    completeLastAssistant,
    setLastAssistantContent,
    persist,
    removeLastAssistantIfEmpty,
    lastAssistant,
    genId,
  }
})
