<script setup lang="ts">
import TraceStepView from './TraceStepView.vue'
import type { TraceTurn } from '../types'

defineProps<{
  turn: TraceTurn
}>()
</script>

<template>
  <div class="turn" :data-qnav="turn.id" :class="{ active: turn.active, done: turn.done }">
    <div class="turn-head">
      <div class="turn-q">{{ turn.question }}</div>
      <div class="turn-meta">{{ turn.time }}</div>
    </div>
    <div class="turn-body">
      <TraceStepView v-for="step in turn.steps" :key="step.key" :step="step" />
    </div>
    <div class="turn-foot">✓ 本轮完成</div>
  </div>
</template>
