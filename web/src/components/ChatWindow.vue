<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useStream } from '@/composables/useStream'
import MessageBubble from '@/components/MessageBubble.vue'
import AppHeader from '@/components/AppHeader.vue'
import NavLinkButton from '@/components/NavLinkButton.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import WorkDirSelector from '@/components/WorkDirSelector.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'
import QuestionNavFab from '@/components/QuestionNavFab.vue'
import ErrorBar from '@/components/ErrorBar.vue'
import ChatComposer from '@/components/ChatComposer.vue'

const chat = useChatStore()
const { sendMessage } = useStream()

const messagesEl = ref<HTMLDivElement | null>(null)
const scrollTop = ref(0)

const messages = computed(() => chat.activeConversation()?.messages ?? [])

const questionNavItems = computed(() =>
  messages.value
    .filter((m) => m.role === 'user')
    .map((m) => ({ id: m.id, label: m.content.trim() || '（空）' })),
)

const streamingCursorMessageId = computed(() => {
  if (!chat.streaming) return null
  const last = [...messages.value].reverse().find(m => m.role === 'assistant')
  return last?.id ?? null
})

const SESSION_MAP_KEY = 'mimo-web-session-map'

const traceHref = computed(() => {
  const conv = chat.activeConversation()
  if (!conv) return '/trace.html'
  try {
    const raw = localStorage.getItem(SESSION_MAP_KEY)
    const map = raw ? JSON.parse(raw) as Record<string, { sessionId?: string }> : {}
    const sid = map[conv.id]?.sessionId
    return sid ? `/trace.html?session=${encodeURIComponent(sid)}` : '/trace.html'
  } catch {
    return '/trace.html'
  }
})

const headerTitle = computed(
  () => currentQuestion.value || chat.activeConversation()?.title || '新对话',
)

const currentQuestion = computed(() => {
  if (messages.value.length === 0) return ''
  if (scrollTop.value < 100) return ''
  const userMessages = messages.value.filter(m => m.role === 'user')
  if (userMessages.length === 0) return ''
  const text = userMessages[userMessages.length - 1].content.trim()
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
})

function updateScrollTop() {
  if (messagesEl.value) scrollTop.value = messagesEl.value.scrollTop
}

onMounted(() => {
  messagesEl.value?.addEventListener('scroll', updateScrollTop)
})

onUnmounted(() => {
  messagesEl.value?.removeEventListener('scroll', updateScrollTop)
})

function scrollToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    })
  })
}

const scrollFingerprint = computed(() => {
  const msgs = messages.value
  const last = msgs[msgs.length - 1]
  if (!last) return ''
  const acts = last.activities?.map((a) => `${a.key}:${a.status}:${a.label.length}`).join('|') ?? ''
  return `${msgs.length}:${last.content.length}:${last.reasoning?.length ?? 0}:${acts}:${chat.streaming}:${last.completedAt ?? 0}`
})

watch(scrollFingerprint, scrollToBottom)
watch(() => messages.value.length, scrollToBottom)
watch(() => chat.streaming, scrollToBottom)
watch(() => chat.activeId, scrollToBottom)

function onSend(text: string, images: string[]) {
  sendMessage(text, images)
}
</script>

<template>
  <div class="chat-window">
    <AppHeader title-max-width="300px">
      <template #title>{{ headerTitle }}</template>
      <template #actions>
        <NavLinkButton :href="traceHref" title="BcAI 调用过程" external>Trace</NavLinkButton>
        <WorkDirSelector />
        <ServiceStatus />
        <ModelSelector />
      </template>
    </AppHeader>

    <div ref="messagesEl" class="messages">
      <div v-if="messages.length === 0" class="empty-state">
        <img class="empty-logo" src="/favicon.svg" alt="BcAI" />
        <h2>BcAI</h2>
        <p>直连 mimo serve 的 AI 助手，支持工具调用与 Trace 可视化</p>
        <div class="quick-prompts">
          <button
            v-for="p in ['帮我查看当前目录有哪些文件', '介绍一下这个项目', '解释一下 Vue 3 组合式 API']"
            :key="p"
            type="button"
            class="quick-btn"
            @click="sendMessage(p)"
          >{{ p }}</button>
        </div>
      </div>

      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :show-cursor="msg.id === streamingCursorMessageId"
      />
    </div>

    <ErrorBar v-if="chat.error" :message="chat.error" @dismiss="chat.error = null" />

    <div class="chat-bottom">
      <ChatComposer :disabled="chat.streaming" @send="onSend" />
    </div>

    <QuestionNavFab
      :items="questionNavItems"
      :scroll-root="messagesEl"
      :offset-bottom="108"
    />
  </div>
</template>

<style scoped>
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 40px;
  text-align: center;
}

.empty-logo {
  width: 56px;
  height: 56px;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
}

.empty-state p {
  color: var(--text-2);
  max-width: 420px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}

.quick-btn {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 13px;
  background: var(--bg-2);
  transition: all 0.15s;
}

.quick-btn:hover {
  border-color: var(--accent);
  color: var(--accent-hover);
  background: var(--accent-dim);
}

.chat-bottom {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--bg-2);
}
</style>
