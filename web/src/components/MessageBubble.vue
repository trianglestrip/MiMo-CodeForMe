<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { renderMarkdown, highlightCodeBlocks } from '@/lib/markdown'
import { yieldToMain } from '@/lib/asyncLocalStorage'
import { fmtBeijingTime, fmtDuration, fmtTokenCount } from '@/lib/formatTime'
import { attachmentKind, mimeBadge, resolveMessageAttachments } from '@/lib/composer/attachments'
import { fetchDebugContext, type DebugContextSnapshot } from '@/lib/mimo/client'
import { getWorkDir } from '@/lib/workDir'
import AssistantActivities from '@/components/AssistantActivities.vue'
import IncompleteNotice from '@/components/IncompleteNotice.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import type { ChatMessage } from '@/stores/chat'

const props = defineProps<{
  message: ChatMessage
  showCursor?: boolean
  traceHref?: string
  sessionId?: string
}>()

const contentRef = ref<HTMLElement | null>(null)
const bodyReady = ref(false)
const renderedContent = ref('')
const debugOpen = ref(false)
const debugLoading = ref(false)
const debugError = ref<string | null>(null)
const debugSnapshot = ref<DebugContextSnapshot | null>(null)

async function renderBody() {
  await yieldToMain()
  renderedContent.value = renderMarkdown(props.message.content || '')
  bodyReady.value = true
  await syncHighlight()
}

async function syncHighlight() {
  await nextTick()
  if (contentRef.value) highlightCodeBlocks(contentRef.value)
}

async function openDebugContext() {
  if (!props.sessionId) {
    debugError.value = '未关联 MiMo session'
    debugOpen.value = true
    return
  }
  debugOpen.value = true
  debugLoading.value = true
  debugError.value = null
  debugSnapshot.value = null
  try {
    debugSnapshot.value = await fetchDebugContext(
      props.sessionId,
      getWorkDir(),
      props.message.backendMessageId,
    )
  } catch (e) {
    debugError.value = e instanceof Error ? e.message : '加载调试上下文失败'
  } finally {
    debugLoading.value = false
  }
}

const debugSystemText = computed(() => debugSnapshot.value?.system.join('\n\n') ?? '')
const debugAdditionsText = computed(() => debugSnapshot.value?.additions.join('\n\n') ?? '')
const debugToolsText = computed(() => debugSnapshot.value?.tools.join('\n') ?? '')
const debugPathsText = computed(() => debugSnapshot.value?.instructionPaths.join('\n') ?? '')

onMounted(() => {
  void renderBody()
})

watch(() => props.message.content, () => {
  if (!bodyReady.value) return
  void (async () => {
    await yieldToMain()
    renderedContent.value = renderMarkdown(props.message.content || '')
    await syncHighlight()
  })()
})

const userAttachments = computed(() => resolveMessageAttachments(props.message))

const userImageUrls = computed(() =>
  userAttachments.value.filter((a) => attachmentKind(a.mime) === 'image').map((a) => a.url),
)
</script>

<template>
  <div class="message-row" :class="message.role" :data-qnav="message.role === 'user' ? message.id : undefined">
    <ElCard
      v-if="message.role === 'user'"
      class="user-card"
      shadow="never"
    >
      <div class="user-card-head">
        <ElText tag="div" type="info" size="small" class="msg-time">{{ fmtBeijingTime(message.createdAt) }}</ElText>
        <ElButton
          v-if="sessionId"
          class="debug-btn"
          text
          size="small"
          title="查看 LLM 调试上下文"
          @click="openDebugContext"
        >
          🐛
        </ElButton>
      </div>
      <div v-if="userAttachments.length" class="msg-attachments">
        <template v-for="file in userAttachments" :key="file.id">
          <ElImage
            v-if="attachmentKind(file.mime) === 'image'"
            :src="file.url"
            :preview-src-list="userImageUrls"
            :initial-index="userImageUrls.indexOf(file.url)"
            fit="cover"
            class="msg-image"
          />
          <div v-else class="msg-file" :title="file.filename">
            <ElTag size="small" effect="dark" class="msg-file-badge">{{ mimeBadge(file.mime) }}</ElTag>
            <span class="msg-file-name">{{ file.filename }}</span>
          </div>
        </template>
      </div>
      <p class="user-text">{{ message.content }}</p>
    </ElCard>

    <div
      v-else-if="message.role === 'assistant'"
      class="bubble assistant-bubble"
    >
      <div v-if="message.model" class="assistant-header">
        <ElTag size="small" type="info">{{ message.model }}</ElTag>
      </div>

      <AssistantActivities
        v-if="message.activities?.length"
        :activities="message.activities"
        :show-cursor="showCursor"
        :completed="Boolean(message.completedAt)"
      />

      <div v-if="message.content && !bodyReady" class="bubble-sk">
        <SkeletonBlock width="88%" height="14px" />
        <SkeletonBlock width="72%" height="14px" />
        <SkeletonBlock width="56%" height="14px" />
      </div>
      <div v-else-if="message.content" ref="contentRef" class="md-content" v-html="renderedContent" />
      <IncompleteNotice
        v-if="message.incomplete && message.stopReason"
        :reason="message.stopReason"
        :trace-href="traceHref"
      />
      <ElText
        v-if="message.completedAt && message.durationMs != null"
        tag="div"
        type="info"
        size="small"
        class="reply-meta"
      >
        用时 {{ fmtDuration(message.durationMs) }}
        <template v-if="message.usage?.total">
          · {{ fmtTokenCount(message.usage.total) }} tokens
        </template>
      </ElText>
      <ElText
        v-else-if="showCursor && !message.activities?.length"
        tag="div"
        size="small"
        class="streaming-hint"
      >
        <ElIcon class="is-loading"><Loading /></ElIcon>
        正在回复…
      </ElText>
      <ElText v-else-if="!showCursor && !message.content" tag="p" type="info" size="small" class="empty-reply">
        （等待回复…）
      </ElText>
    </div>
  </div>

  <ElDialog v-model="debugOpen" title="LLM 调试上下文" width="720px" destroy-on-close>
    <div v-if="debugLoading" class="debug-loading">
      <ElIcon class="is-loading"><Loading /></ElIcon>
      加载中…
    </div>
    <ElAlert v-else-if="debugError" type="warning" :title="debugError" show-icon :closable="false" />
    <template v-else-if="debugSnapshot">
      <ElCollapse>
        <ElCollapseItem title="System Prompt" name="system">
          <pre class="debug-pre">{{ debugSystemText || '（空）' }}</pre>
        </ElCollapseItem>
        <ElCollapseItem title="Instruction Paths" name="paths">
          <pre class="debug-pre">{{ debugPathsText || '（空）' }}</pre>
        </ElCollapseItem>
        <ElCollapseItem title="Additions" name="additions">
          <pre class="debug-pre">{{ debugAdditionsText || '（空）' }}</pre>
        </ElCollapseItem>
        <ElCollapseItem :title="`Tools (${debugSnapshot.tools.length})`" name="tools">
          <pre class="debug-pre">{{ debugToolsText || '（空）' }}</pre>
        </ElCollapseItem>
        <ElCollapseItem title="Meta" name="meta">
          <pre class="debug-pre">messageCount: {{ debugSnapshot.messageCount }}
capturedAt: {{ fmtBeijingTime(debugSnapshot.capturedAt) }}</pre>
        </ElCollapseItem>
      </ElCollapse>
    </template>
  </ElDialog>
</template>

<style scoped>
.message-row {
  display: flex;
  padding: 4px 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
.message-row.user { justify-content: flex-end; }
.message-row.assistant { justify-content: flex-start; }

.user-card {
  max-width: 85%;
  background: var(--user-bubble);
  border: 1px solid rgba(108, 110, 247, 0.3);
}

.user-card :deep(.el-card__body) {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
}

.msg-time {
  display: block;
  margin-bottom: 0;
  text-align: right;
}

.user-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.debug-btn {
  opacity: 0.55;
  padding: 0 4px;
  min-height: auto;
}

.user-card:hover .debug-btn {
  opacity: 1;
}

.debug-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  max-height: 320px;
  overflow: auto;
}

.debug-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}

.user-text {
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.assistant-bubble {
  background: transparent;
  max-width: 100%;
  width: 100%;
  padding: 4px 0;
  font-size: 14px;
  line-height: 1.6;
}

.bubble-sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 8px;
  max-width: 520px;
}

.assistant-header { margin-bottom: 6px; }

.reply-meta {
  margin-top: 10px;
}

.streaming-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  color: var(--text);
}

.empty-reply {
  font-style: italic;
}

.msg-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.msg-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.msg-file-badge {
  flex-shrink: 0;
  border: none;
}

.msg-file-name {
  font-size: 12px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.msg-image {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-sm);
}
</style>
