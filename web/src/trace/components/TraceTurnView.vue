<script setup lang="ts">
import { computed } from 'vue'
import TraceStepView from './TraceStepView.vue'
import { turnAccentStyle } from '../utils'
import type { TraceTurn } from '../types'

const props = defineProps<{
  turn: TraceTurn
}>()

const accentStyle = computed(() => turnAccentStyle(props.turn.id))
</script>

<template>
  <section
    class="trace-turn"
    :data-qnav="turn.id"
    :class="{ active: turn.active, done: turn.done }"
    :style="accentStyle"
  >
    <div class="turn-head">
      <ElText tag="div" class="turn-q">{{ turn.question }}</ElText>
      <div class="turn-meta-wrap">
        <ElTag v-if="turn.done" type="success" size="small" class="turn-done-tag">完成</ElTag>
        <ElText type="info" size="small" class="turn-meta">{{ turn.time }}</ElText>
      </div>
    </div>

    <div v-if="turn.steps.length" class="turn-answers">
      <div class="turn-a-label">答：</div>
      <div class="turn-steps">
        <TraceStepView v-for="step in turn.steps" :key="step.key" :step="step" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.trace-turn {
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 2px solid var(--turn-accent-border, var(--border));
  background: var(--bg-2);
  border-radius: var(--radius-sm);
}

.trace-turn.active {
  border-color: var(--turn-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--turn-accent, var(--accent)) 22%, transparent);
}

.turn-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.turn-q {
  font-size: 13px;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.turn-q::before {
  content: '问：';
  color: var(--turn-accent, var(--free-color));
  font-weight: 600;
}

.turn-meta-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.turn-done-tag {
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
}

.turn-meta {
  white-space: nowrap;
  font-size: 11px;
}

.turn-answers {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.turn-a-label {
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--turn-accent, var(--accent));
  margin-bottom: 4px;
}

.turn-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
