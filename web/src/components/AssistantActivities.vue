<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import FlowStrip from '@/components/FlowStrip.vue'
import type { ActivityStep } from '@/stores/chat'

const props = defineProps<{
  activities: ActivityStep[]
  showCursor?: boolean
  completed?: boolean
}>()

const listEl = ref<HTMLElement | null>(null)

const pulseStepId = computed(() => {
  if (!props.showCursor) return null
  if (!props.activities.length) return null
  for (let i = props.activities.length - 1; i >= 0; i--) {
    if (props.activities[i].status === 'running') return props.activities[i].id
  }
  return props.activities[props.activities.length - 1].id
})

function scrollListToEnd() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = listEl.value
      if (!el) return
      el.scrollTop = el.scrollHeight
    })
  })
}

watch(
  () =>
    props.showCursor
      ? props.activities.map((a) => `${a.id}:${a.status}:${a.label.length}`).join('|')
      : null,
  (v) => {
    if (v != null) scrollListToEnd()
  },
  { flush: 'post' },
)

onMounted(() => {
  if (props.showCursor) scrollListToEnd()
})
</script>

<template>
  <div v-if="activities.length" class="assistant-activities">
    <div ref="listEl" class="activity-list">
      <div
        v-for="step in activities"
        :key="step.id"
        class="activity-line"
        :class="[
          `phase-${step.phase}`,
          step.status === 'done' ? 'is-done' : '',
          step.status === 'error' ? 'is-error' : '',
          step.id === pulseStepId ? 'is-active' : '',
        ]"
      >
        <span
          v-if="step.id === pulseStepId"
          class="activity-dot pulsing"
          aria-hidden="true"
        />
        <span v-else class="activity-dot-spacer" aria-hidden="true" />
        <span class="activity-label" :title="step.label">{{ step.label }}</span>
      </div>
    </div>

    <FlowStrip
      embedded
      :activities="activities"
      :active="showCursor"
      :done="completed && !showCursor"
    />
  </div>
</template>

<style scoped>
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  max-height: calc(12px * 1.5 * 5 + 4px * 4 + 16px);
  overflow-y: auto;
}

.activity-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}

.activity-line.is-active {
  color: var(--text);
}

.activity-line.is-done {
  color: var(--text-3);
}

.activity-line.is-error {
  color: #f87171;
}

.activity-dot-spacer {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
}

.activity-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.activity-line.phase-think .activity-dot { background: #a78bfa; }
.activity-line.phase-tool .activity-dot { background: #fb923c; }
.activity-line.phase-output .activity-dot { background: #60a5fa; }

.activity-dot.pulsing {
  animation: activity-bounce 0.9s ease-in-out infinite;
}

.activity-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes activity-bounce {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.55; }
}
</style>
