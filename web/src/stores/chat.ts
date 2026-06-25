import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToolCallPayload {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ActivityPhase = 'think' | 'tool' | 'output'
export type ActivityStatus = 'running' | 'done' | 'error'

export interface ActivityStep {
  id: string
  key: string
  phase: ActivityPhase
  label: string
  status: ActivityStatus
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  reasoning?: string
  activities?: ActivityStep[]
  createdAt: number
  completedAt?: number
  durationMs?: number
  usage?: { total: number; input: number; output: number }
  model?: string
  toolCalls?: ToolCallPayload[]
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const LOCAL_CONV_KEY = 'mimo-web-conversations'

function saveLocalConversations(conversations: Conversation[]) {
  localStorage.setItem(LOCAL_CONV_KEY, JSON.stringify(conversations))
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const activeId = ref<string | null>(null)
  const streaming = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const activeConversation = () =>
    conversations.value.find(c => c.id === activeId.value) ?? null

  async function init() {
    try {
      const raw = localStorage.getItem(LOCAL_CONV_KEY)
      conversations.value = raw ? (JSON.parse(raw) as Conversation[]) : []
      activeId.value = conversations.value[0]?.id ?? null
      if (conversations.value.length === 0) await newConversation()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load conversations'
    } finally {
      loaded.value = true
    }
  }

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
    saveLocalConversations(conversations.value)
    return conv
  }

  async function deleteConversation(id: string) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id ?? null
      if (conversations.value.length === 0) await newConversation()
    }
    saveLocalConversations(conversations.value)
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
    saveLocalConversations(conversations.value)
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
    saveLocalConversations(conversations.value)
  }

  function finishAssistantActivities() {
    const last = lastAssistant()
    if (!last?.activities?.length) return
    for (const a of last.activities) {
      if (a.status === 'running') a.status = 'done'
    }
    saveLocalConversations(conversations.value)
  }

  function completeLastAssistant(meta?: { usage?: ChatMessage['usage'] }) {
    const last = lastAssistant()
    if (!last) return
    const now = Date.now()
    last.completedAt = now
    last.durationMs = now - last.createdAt
    if (meta?.usage) last.usage = meta.usage
    const conv = activeConversation()
    if (conv) conv.updatedAt = now
    saveLocalConversations(conversations.value)
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
      saveLocalConversations(conversations.value)
    }
  }

  function appendToLastAssistant(text: string) {
    const conv = activeConversation()
    if (!conv) return
    const last = [...conv.messages].reverse().find(m => m.role === 'assistant')
    if (last) {
      last.content += text
      conv.updatedAt = Date.now()
      saveLocalConversations(conversations.value)
    }
  }

  async function persist() {
    const conv = activeConversation()
    if (!conv) return
    saveLocalConversations(conversations.value)
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
      saveLocalConversations(conversations.value)
    }
  }

  return {
    conversations,
    activeId,
    streaming,
    error,
    loaded,
    activeConversation,
    init,
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
    genId,
  }
})
