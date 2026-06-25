<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { renderMarkdown, highlightCodeBlocks } from '@/lib/markdown'
import { yieldToMain } from '@/lib/asyncLocalStorage'
import { fmtBeijingTime, fmtDuration, fmtTokenCount } from '@/lib/formatTime'
import { phaseIconClass } from '@/lib/phaseIcons'
import { attachmentKind, mimeBadge, resolveMessageAttachments } from '@/lib/composer/attachments'
import AssistantActivities from '@/components/AssistantActivities.vue'
import IncompleteNotice from '@/components/IncompleteNotice.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import type { ChatMessage } from '@/stores/chat'

const props = defineProps<{
  message: ChatMessage
  showCursor?: boolean
  traceHref?: string
}>()

const contentRef = ref<HTMLElement | null>(null)
const bodyReady = ref(false)
const renderedContent = ref('')

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

const reasoningOpen = ref<string[]>([])

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
      <ElText tag="div" type="info" size="small" class="msg-time">{{ fmtBeijingTime(message.createdAt) }}</ElText>
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

      <ElCollapse
        v-if="message.reasoning"
        v-model="reasoningOpen"
        class="reasoning-block phase-think"
      >
        <ElCollapseItem name="reasoning">
          <template #title>
            <i :class="phaseIconClass('think')" class="reasoning-tag-icon" aria-hidden="true" />
            <span>思考过程</span>
            <ElText type="info" size="small" class="reasoning-len">{{ message.reasoning.length }} 字符</ElText>
          </template>
          <div class="reasoning-content">{{ message.reasoning }}</div>
        </ElCollapseItem>
      </ElCollapse>

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
  margin-bottom: 6px;
  text-align: right;
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

.reasoning-block {
  margin-bottom: 10px;
  border: none;
}

.reasoning-block :deep(.el-collapse-item__header) {
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  padding: 0 8px 0 6px;
  border-bottom: none;
}

.reasoning-tag-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.reasoning-len {
  margin-left: auto;
  padding-right: 8px;
}

.reasoning-content {
  padding: 0 12px 10px;
  font-size: 12px;
  white-space: pre-wrap;
  line-height: 1.65;
  max-height: 300px;
  overflow-y: auto;
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
