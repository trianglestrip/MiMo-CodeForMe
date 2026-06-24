<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useStream } from '@/composables/useStream'
import MessageBubble from '@/components/MessageBubble.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'

const chat = useChatStore()
const { sendMessage } = useStream()

const input = ref('')
const messagesEl = ref<HTMLDivElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const pendingImages = ref<string[]>([])   // base64 data URLs waiting to be sent

const messages = computed(() => chat.activeConversation()?.messages ?? [])

const streamingCursorMessageId = computed(() => {
  if (!chat.streaming) return null
  const last = [...messages.value].reverse().find(m => m.role === 'assistant')
  return last?.id ?? null
})
const scrollTop = ref(0)

const currentQuestion = computed(() => {
  if (messages.value.length === 0) return ''

  // Show current question when scrolled down
  if (scrollTop.value < 100) return ''

  // Find the last user message
  const userMessages = messages.value.filter(m => m.role === 'user')
  if (userMessages.length === 0) return ''

  const lastQuestion = userMessages[userMessages.length - 1]
  const text = lastQuestion.content.trim()
  return text.length > 60 ? text.slice(0, 60) + '...' : text
})

function updateCurrentQuestion() {
  if (messagesEl.value) {
    scrollTop.value = messagesEl.value.scrollTop
  }
}

onMounted(() => {
  messagesEl.value?.addEventListener('scroll', updateCurrentQuestion)
})

onUnmounted(() => {
  messagesEl.value?.removeEventListener('scroll', updateCurrentQuestion)
})

function scrollToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (messagesEl.value)
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    })
  })
}

const scrollFingerprint = computed(() => {
  const msgs = messages.value
  const last = msgs[msgs.length - 1]
  if (!last) return ''
  const acts = last.activities?.map((a) => `${a.key}:${a.status}:${a.label.length}`).join('|') ?? ''
  return `${msgs.length}:${last.content.length}:${last.reasoning?.length ?? 0}:${acts}:${chat.streaming}`
})

watch(scrollFingerprint, scrollToBottom)
watch(() => messages.value.length, scrollToBottom)
watch(() => chat.streaming, scrollToBottom)
watch(() => chat.activeId, scrollToBottom)

const canSend = computed(
  () => (input.value.trim() || pendingImages.value.length) && !chat.streaming,
)

const inputPlaceholder = computed(() =>
  chat.streaming ? '等待回答完成…' : '发送消息…',
)

const sendButtonTitle = computed(() =>
  chat.streaming ? '等待当前回答完成' : '发送',
)

async function submit() {
  const text = input.value.trim()
  if (!canSend.value) return
  const images = [...pendingImages.value]
  input.value = ''
  pendingImages.value = []
  await sendMessage(text || '请分析这张图片', images)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); submit() }
}

// Paste image from clipboard
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) addImageFile(file)
    }
  }
}

// File picker
function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  Array.from(files).forEach(addImageFile)
  if (fileInputEl.value) fileInputEl.value.value = ''
}

function addImageFile(file: File) {
  if (pendingImages.value.length >= 4) return  // max 4 images
  const reader = new FileReader()
  reader.onload = (ev) => {
    const url = ev.target?.result as string
    if (url) pendingImages.value.push(url)
  }
  reader.readAsDataURL(file)
}

function removeImage(idx: number) {
  pendingImages.value.splice(idx, 1)
}
</script>

<template>
  <div class="chat-window">
    <!-- Top bar -->
    <header class="chat-header">
      <div class="header-left">
        <span class="conv-title">{{ currentQuestion || chat.activeConversation()?.title || '新对话' }}</span>
      </div>
      <div class="header-right">
        <a href="/trace.html" target="_blank" class="trace-link" title="MiMo 调用过程">Trace</a>
        <ServiceStatus />
        <ModelSelector />
      </div>
    </header>

    <!-- Messages area -->
    <div class="messages" ref="messagesEl">

      <div v-if="messages.length === 0" class="empty-state">
        <img class="empty-logo" src="/favicon.svg" alt="MiMoCode" />
        <h2>MiMoCode</h2>
        <p>直连 mimo serve 的 AI 助手，支持工具调用与 Trace 可视化</p>
        <div class="quick-prompts">
          <button
            v-for="p in ['帮我查看当前目录有哪些文件', '介绍一下这个项目', '解释一下 Vue 3 组合式 API']"
            :key="p"
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

    <!-- Error banner -->
    <div v-if="chat.error" class="error-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ chat.error }}
      <button @click="chat.error = null">✕</button>
    </div>

    <!-- Input area -->
    <div class="input-area">
      <!-- Image previews -->
      <div v-if="pendingImages.length" class="image-previews">
        <div v-for="(img, i) in pendingImages" :key="i" class="image-preview-wrap">
          <img :src="img" class="image-thumb" alt="附图" />
          <button class="image-remove" @click="removeImage(i)" title="移除">✕</button>
        </div>
      </div>

      <div class="input-box" @paste="onPaste">
        <!-- Hidden file input -->
        <input
          ref="fileInputEl"
          type="file"
          accept="image/*"
          multiple
          class="file-input-hidden"
          @change="onFileChange"
        />
        <!-- Image upload button -->
        <button
          class="attach-btn"
          @click="fileInputEl?.click()"
          :disabled="pendingImages.length >= 4"
          title="上传图片 (也可直接粘贴)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          v-model="input"
          type="text"
          class="input-field"
          :placeholder="inputPlaceholder"
          @keydown="onKeydown"
        />
        <button
          class="send-btn"
          :class="{ active: canSend }"
          :disabled="!canSend"
          @click="submit"
          :title="sendButtonTitle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
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

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
  flex-shrink: 0;
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.trace-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.trace-link:hover {
  background: var(--accent-dim);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
  position: relative;
}

/* Empty state */
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

/* Error bar */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(248, 113, 113, 0.1);
  border-top: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--error);
  font-size: 13px;
  flex-shrink: 0;
}
.error-bar button {
  margin-left: auto;
  color: var(--error);
  opacity: 0.7;
}
.error-bar button:hover { opacity: 1; }

/* Input area */
.input-area {
  padding: 12px 32px 10px;
  border-top: 1px solid var(--border);
  background: var(--bg-2);
  flex-shrink: 0;
}
.input-area > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.input-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  transition: border-color 0.15s;
}
.input-box:focus-within {
  border-color: var(--accent);
}

/* Image previews */
.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.image-preview-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}
.image-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.image-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--error);
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.file-input-hidden { display: none; }

.attach-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-3);
  transition: color 0.15s, background 0.15s;
}
.attach-btn:hover:not(:disabled) { color: var(--accent); background: var(--bg-2); }
.attach-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.input-field {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 14px;
  line-height: 32px;
  height: 32px;
  min-width: 0;
  padding: 0;
}
.input-field::placeholder { color: var(--text-3); }
.input-field:disabled { opacity: 0.5; }

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-3);
  background: var(--bg-2);
  border: 1px solid var(--border);
  transition: all 0.15s;
}
.send-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.send-btn.active:hover {
  background: var(--accent-hover);
}

</style>
