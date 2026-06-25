<script setup lang="ts">
import type { TraceStep } from '../types'

defineProps<{
  step: TraceStep
}>()
</script>

<template>
  <div class="flow-step" :class="`step-${step.cls}`">
    <div class="step-line">
      <div class="step-num">{{ step.num }}</div>
      <div class="step-main">
        <div class="step-title">
          <span class="tag">{{ step.tag }}</span>
          <span class="step-head-text">{{ step.title }}</span>
        </div>
        <div v-if="step.intent" class="step-intent">{{ step.intent }}</div>
        <div v-if="step.inputLine" class="step-input">{{ step.inputLine }}</div>
        <pre
          v-if="step.text"
          class="step-preview"
          :class="{ live: step.live, hidden: !step.text.trim() && step.done }"
        >{{ step.text }}</pre>
        <div
          v-if="step.sub"
          class="step-sub"
          :class="{ ok: step.subOk === true, err: step.subOk === false }"
        >{{ step.sub }}</div>
      </div>
    </div>
  </div>
</template>
