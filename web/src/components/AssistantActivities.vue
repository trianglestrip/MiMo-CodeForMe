<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import FlowStrip from '@/components/FlowStrip.vue'
import { activityIconClass, toolStatusIconClass } from '@/lib/phaseIcons'
import { phaseTag } from '@/lib/partPhase'
import type { ScrollbarInstance } from 'element-plus'
import type { ActivityStep } from '@/stores/chat'

const props = defineProps<{
  activities: ActivityStep[]
  showCursor?: boolean
  completed?: boolean
}>()

const listEl = ref<ScrollbarInstance | null>(null)

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
      const sb = listEl.value
      const wrap = sb?.wrapRef
      if (!sb || !wrap) return
      const top = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
      if (typeof sb.setScrollTop === 'function') sb.setScrollTop(top)
      else wrap.scrollTop = top
    })
  })
}

const activityFingerprint = computed(() =>
  props.activities.map((a) => `${a.id}:${a.status}:${a.label.length}`).join('|'),
)

watch(activityFingerprint, scrollListToEnd, { flush: 'post' })

onMounted(scrollListToEnd)
</script>

<template>
  <div v-if="activities.length" class="assistant-activities">
    <ElScrollbar ref="listEl" always class="activity-list">
      <div class="activity-items">
        <div
          v-for="step in activities"
          :key="step.id"
          class="activity-item"
          :class="[
            `phase-${step.phase}`,
            step.status === 'done' ? 'is-done' : '',
            step.status === 'error' ? 'is-error' : '',
            step.id === pulseStepId ? 'is-active' : '',
          ]"
        >
          <div class="activity-chip">
            <span class="activity-type-tag">
              <i
                class="activity-phase-icon"
                :class="[
                  activityIconClass(step.phase, step.key, step.label),
                  step.status === 'error' ? 'is-error-icon' : '',
                ]"
                aria-hidden="true"
              />
              {{ phaseTag(step.phase) }}
            </span>
            <span class="activity-label" :title="step.label">{{ step.label }}</span>
            <i
              v-if="step.phase === 'tool' && toolStatusIconClass(step.status)"
              class="activity-status-icon"
              :class="[toolStatusIconClass(step.status)!, step.status === 'error' ? 'is-error-icon' : '']"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </ElScrollbar>

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
  margin-bottom: 6px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  height: calc(12px * 1.25 * 5 + 2px * 4 + 8px);
}

.activity-list :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.activity-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: calc(12px * 1.25);
  padding: 1px 0;
  font-size: 12px;
  line-height: 1.25;
}

.activity-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
}

.activity-phase-icon {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  font-size: 10px;
  line-height: 1;
}

.activity-status-icon {
  flex-shrink: 0;
  font-size: 10px;
}

.activity-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
