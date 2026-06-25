<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { renderMarkdown, highlightCodeBlocks } from '@/lib/markdown'
import { fmtBeijingTime, fmtDuration, fmtTokenCount } from '@/lib/formatTime'
import AssistantActivities from '@/components/AssistantActivities.vue'
import type { ChatMessage } from '@/stores/chat'

const props = defineProps<{
  message: ChatMessage
  showCursor?: boolean
}>()

const contentRef = ref<HTMLElement | null>(null)

const renderedContent = computed(() =>
  renderMarkdown(props.message.content || '')
)

async function syncHighlight() {
  await nextTick()
  if (contentRef.value) highlightCodeBlocks(contentRef.value)
}

watch(() => props.message.content, () => {
  syncHighlight()
}, { flush: 'post' })
onMounted(syncHighlight)

const reasoningOpen = ref(false)

const showInlineReasoning = computed(
  () => !(props.message.activities ?? []).some((s) => s.phase === 'think'),
)
</script>

<template>
  <div class="message-row" :class="message.role" :data-qnav="message.role === 'user' ? message.id : undefined">
    <!-- User message -->
    <div v-if="message.role === 'user'" class="bubble user-bubble">
      <div class="msg-time">{{ fmtBeijingTime(message.createdAt) }}</div>
      <!-- Attached images -->
      <div v-if="message.images?.length" class="msg-images">
        <img
          v-for="(img, i) in message.images"
          :key="i"
          :src="img"
          class="msg-image"
          alt="附图"
        />
      </div>
      <p class="user-text">{{ message.content }}</p>
    </div>

    <!-- Assistant message -->
    <div
      v-else-if="message.role === 'assistant'"
      class="bubble assistant-bubble"
    >
      <div v-if="message.model" class="assistant-header">
        <span class="model-tag">{{ message.model }}</span>
      </div>

      <AssistantActivities
        v-if="message.activities?.length"
        :activities="message.activities"
        :show-cursor="showCursor"
        :completed="Boolean(message.completedAt)"
      />

      <!-- Reasoning / thinking block (fallback when no inline steps) -->
      <div v-if="message.reasoning && showInlineReasoning" class="reasoning-block">
        <button class="reasoning-toggle" @click="reasoningOpen = !reasoningOpen">
          <svg :style="{ transform: reasoningOpen ? 'rotate(90deg)' : 'none' }"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span>思考过程</span>
          <span class="reasoning-len">{{ message.reasoning.length }} 字符</span>
        </button>
        <div v-if="reasoningOpen" class="reasoning-content">{{ message.reasoning }}</div>
      </div>

      <!-- Main content -->
      <div v-if="message.content" ref="contentRef" class="md-content" v-html="renderedContent" />
      <div
        v-if="message.completedAt && message.durationMs != null"
        class="reply-meta"
      >
        用时 {{ fmtDuration(message.durationMs) }}
        <template v-if="message.usage?.total">
          · {{ fmtTokenCount(message.usage.total) }} tokens
        </template>
      </div>
      <div v-else-if="showCursor && !message.activities?.length" class="activity-line is-active standalone">
        <span class="activity-dot pulsing" aria-hidden="true" />
        <span class="activity-label">正在回复…</span>
      </div>
      <p v-else-if="!showCursor && !message.content" class="empty-reply">（等待回复…）</p>
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

.bubble {
  max-width: 85%;
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
}

.user-bubble {
  background: var(--user-bubble);
  border: 1px solid rgba(108, 110, 247, 0.3);
}
.msg-time {
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 6px;
  text-align: right;
}
.user-text {
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.assistant-bubble {
  background: transparent;
  max-width: 100%;
  width: 100%;
  padding: 4px 0;
}

.assistant-header { margin-bottom: 6px; }

.reply-meta {
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-3);
}
.model-tag {
  font-size: 11px;
  color: var(--text-3);
  background: var(--bg-3);
  padding: 2px 8px;
  border-radius: 10px;
}

/* Reasoning block */
.reasoning-block {
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 12px;
  text-align: left;
  transition: color 0.15s;
}
.reasoning-toggle svg { transition: transform 0.2s; flex-shrink: 0; }
.reasoning-toggle:hover { color: var(--text-2); }
.reasoning-len {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-3);
}
.reasoning-content {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-3);
  white-space: pre-wrap;
  line-height: 1.65;
  background: var(--bg-2);
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid var(--border);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.activity-line.standalone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  color: var(--text);
}

.activity-line.standalone .activity-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a78bfa;
}

.activity-line.standalone .activity-dot.pulsing {
  animation: activity-bounce 0.9s ease-in-out infinite;
}

@keyframes activity-bounce {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.55; }
}

.empty-reply.streaming {
  color: var(--accent);
  font-style: normal;
  animation: pulse 1.2s ease-in-out infinite;
}

.empty-reply {
  font-size: 13px;
  color: var(--text-3);
  font-style: italic;
}

.empty-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  background: var(--accent);
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}
.thinking-label {
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.msg-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  object-fit: cover;
}
</style>
