<script setup lang="ts">
import TraceStepView from './TraceStepView.vue'
import type { TraceTurn } from '../types'

defineProps<{
  turn: TraceTurn
}>()
</script>

<template>
  <ElCard
    class="turn"
    :data-qnav="turn.id"
    :class="{ active: turn.active, done: turn.done }"
    shadow="never"
  >
    <template #header>
      <div class="turn-head">
        <ElText tag="div" class="turn-q">{{ turn.question }}</ElText>
        <ElText type="info" size="small" class="turn-meta">{{ turn.time }}</ElText>
      </div>
    </template>

    <ElTimeline class="turn-body">
      <TraceStepView v-for="step in turn.steps" :key="step.key" :step="step" />
    </ElTimeline>

    <template v-if="turn.done" #footer>
      <ElTag type="success" size="small">本轮完成</ElTag>
    </template>
  </ElCard>
</template>

<style scoped>
.turn {
  margin-bottom: 16px;
}

.turn.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}

.turn-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.turn-q {
  font-size: 14px;
  line-height: 1.5;
}

.turn-q::before {
  content: '问：';
  color: var(--free-color);
  font-weight: 600;
}

.turn-meta {
  white-space: nowrap;
  padding-top: 2px;
}

.turn-body {
  padding: 4px 0;
}

.turn-body :deep(.el-timeline-item:last-child) {
  padding-bottom: 0;
}
</style>
