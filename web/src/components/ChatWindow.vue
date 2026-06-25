<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, provide } from 'vue'
import type { ScrollbarInstance } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useStream } from '@/composables/useStream'
import { PRODUCT_NAME, modelDisplayName } from '@/lib/brand'
import { TURN_ENGINE_KEY } from '@/composables/turn/useTurnEngine'
import MessageBubble from '@/components/MessageBubble.vue'
import AppHeader from '@/components/AppHeader.vue'
import PageNavTabs from '@/components/PageNavTabs.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import WorkDirSelector from '@/components/WorkDirSelector.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'
import QuestionNavFab from '@/components/QuestionNavFab.vue'
import ErrorBar from '@/components/ErrorBar.vue'
import ChatComposer from '@/components/composer/ChatComposer.vue'
import { loadSessionMapAsync } from '@/lib/sessionMap'
import MessageAreaSkeleton from '@/components/skeleton/MessageAreaSkeleton.vue'
import { useAsyncMessageList } from '@/composables/chat/useAsyncMessageList'

const chat = useChatStore()
const { ready: messagesReady, messages, streaming } = useAsyncMessageList()
const settings = useSettingsStore()
const { sendMessage, engine } = useStream()

const productName = PRODUCT_NAME
const currentModelLabel = computed(() =>
  modelDisplayName(settings.currentModel?.name, settings.model),
)
const emptyDescription = computed(
  () => `${productName} 助手 · 当前模型 ${currentModelLabel.value} · 支持工具调用与 Trace`,
)

provide(TURN_ENGINE_KEY, engine)

const messagesEl = ref<ScrollbarInstance | null>(null)
const scrollTop = ref(0)

const messagesScrollRoot = computed(() => messagesEl.value?.wrapRef ?? null)

const questionNavItems = computed(() =>
  messages.value
    .filter((m) => m.role === 'user')
    .map((m) => ({ id: m.id, label: m.content.trim() || '（空）' })),
)

const streamingCursorMessageId = computed(() => {
  if (!streaming.value) return null
  const last = [...messages.value].reverse().find(m => m.role === 'assistant')
  return last?.id ?? null
})

const traceHref = ref('/trace.html')

async function refreshTraceHref() {
  const conv = chat.activeConversation()
  if (!conv) {
    traceHref.value = '/trace.html'
    return
  }
  const map = await loadSessionMapAsync()
  const sid = map[conv.id]?.sessionId
  traceHref.value = sid ? `/trace.html?session=${encodeURIComponent(sid)}` : '/trace.html'
}

watch(() => chat.activeId, () => {
  void refreshTraceHref()
}, { immediate: true })

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
  const wrap = messagesEl.value?.wrapRef
  if (wrap) scrollTop.value = wrap.scrollTop
}

onMounted(() => {
  messagesEl.value?.wrapRef?.addEventListener('scroll', updateScrollTop)
})

onUnmounted(() => {
  messagesEl.value?.wrapRef?.removeEventListener('scroll', updateScrollTop)
})

function scrollToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const wrap = messagesEl.value?.wrapRef
      if (!wrap) return
      wrap.scrollTop = wrap.scrollHeight
    })
  })
}

const scrollFingerprint = computed(() => {
  const msgs = messages.value
  const last = msgs[msgs.length - 1]
  if (!last) return ''
  const acts = last.activities?.map((a) => `${a.key}:${a.status}:${a.label.length}`).join('|') ?? ''
  return `${msgs.length}:${last.content.length}:${last.reasoning?.length ?? 0}:${acts}:${streaming.value}:${last.completedAt ?? 0}`
})

watch(scrollFingerprint, scrollToBottom)
watch(() => messages.value.length, scrollToBottom)
watch(streaming, scrollToBottom)
watch(() => chat.activeId, scrollToBottom)
</script>

<template>
  <ElContainer direction="vertical" class="chat-window shell-vertical">
    <AppHeader>
      <template #breadcrumb>
        <ElBreadcrumbItem>
          <a href="/">{{ productName }}</a>
        </ElBreadcrumbItem>
        <ElBreadcrumbItem>{{ headerTitle }}</ElBreadcrumbItem>
      </template>
      <template #nav>
        <PageNavTabs active="chat" :trace-href="traceHref" />
      </template>
      <template #actions>
        <WorkDirSelector />
        <ServiceStatus />
        <ModelSelector />
      </template>
    </AppHeader>

    <ElMain class="shell-main messages-main">
      <ElScrollbar ref="messagesEl" class="messages">
        <MessageAreaSkeleton v-if="!messagesReady" />

        <template v-else>
          <ElEmpty v-if="messages.length === 0" :description="emptyDescription" :image-size="56">
            <template #image>
              <img class="empty-logo" src="/favicon.svg" :alt="productName" />
            </template>
            <div class="quick-prompts">
              <ElButton
                v-for="p in ['帮我查看当前目录有哪些文件', '介绍一下这个项目', '解释一下 Vue 3 组合式 API']"
                :key="p"
                round
                @click="sendMessage(p)"
              >{{ p }}</ElButton>
            </div>
          </ElEmpty>

          <MessageBubble
            v-for="msg in messages"
            :key="msg.id"
            :message="msg"
            :show-cursor="msg.id === streamingCursorMessageId"
            :trace-href="traceHref"
          />
        </template>
      </ElScrollbar>

      <ErrorBar v-if="chat.error" :message="chat.error" @dismiss="chat.error = null" />
    </ElMain>

    <ElFooter class="shell-footer chat-footer">
      <ChatComposer />
    </ElFooter>

    <QuestionNavFab
      :items="questionNavItems"
      :scroll-root="messagesScrollRoot"
      :offset-bottom="96"
    />
  </ElContainer>
</template>

<style scoped>
.chat-window {
  height: 100%;
}

.messages-main {
  flex: 1;
  position: relative;
}

.messages {
  flex: 1;
  min-height: 0;
  padding: 24px 0;
}

.messages :deep(.el-empty) {
  height: 100%;
  min-height: 280px;
  padding: 40px 20px;
}

.empty-logo {
  width: 56px;
  height: 56px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
  max-width: 520px;
}

.chat-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-2);
}
</style>
