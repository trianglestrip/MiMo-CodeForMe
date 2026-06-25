<script setup lang="ts">
import { computed } from 'vue'
import { activityFlowLabel, flowNodeClass } from '@/lib/flowLabels'
import type { ActivityStep } from '@/stores/chat'

const props = defineProps<{
  activities: ActivityStep[]
  active?: boolean
  done?: boolean
  embedded?: boolean
}>()

const doneSteps = computed(() =>
  props.activities
    .filter((a) => a.status === 'done' || a.status === 'error')
    .map((a) => ({
      key: a.key,
      cls: a.phase,
      label: activityFlowLabel(a.phase, a.label, a.status),
      subOk: a.phase === 'tool' ? a.status !== 'error' : undefined,
    })),
)
</script>

<template>
  <div class="flow-strip" :class="{ active, done, embedded }">
    <div class="section-label flow-label">调用流程</div>
    <div class="flow-strip-track">
      <template v-if="doneSteps.length">
        <template v-for="(step, index) in doneSteps" :key="step.key">
          <span v-if="index > 0" class="flow-arrow" aria-hidden="true">→</span>
          <div
            class="flow-node"
            :class="[flowNodeClass(step.cls, step.subOk), { 'node-new': index === doneSteps.length - 1 && active }]"
            :title="step.label"
          >
            <span class="flow-node-text">{{ step.label }}</span>
          </div>
        </template>
      </template>
      <span v-else-if="active" class="flow-wait">等待执行…</span>
      <template v-if="done">
        <span v-if="doneSteps.length" class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-node node-end">✅ 完成</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.flow-strip {
  flex-shrink: 0;
  padding: 12px 32px 14px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}

.flow-strip.embedded {
  margin-bottom: 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.flow-strip.active {
  background: color-mix(in srgb, var(--accent) 4%, var(--bg-2));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent);
}

.flow-strip.embedded.active {
  background: color-mix(in srgb, var(--accent) 4%, var(--bg-2));
}

.flow-strip.embedded.done {
  background: var(--bg-2);
  box-shadow: none;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.flow-label {
  margin-bottom: 6px;
}

.flow-strip-track {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 6px 4px;
  padding: 2px 0;
}

.flow-wait {
  font-size: 12px;
  color: var(--text-3);
}

.flow-node {
  flex-shrink: 0;
  max-width: 152px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 11px;
  border: 1.5px solid transparent;
  overflow: hidden;
  animation: flow-node-in 0.35s ease-out both;
}

.flow-node-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  line-height: 1.45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.flow-strip.done .flow-node {
  animation: none;
}

.flow-node.node-new {
  animation: flow-node-in 0.35s ease-out both, flow-node-pulse 1.6s ease-in-out 2;
}

.flow-arrow {
  flex-shrink: 0;
  align-self: center;
  margin-top: 8px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1;
  user-select: none;
}

.node-think {
  background: #7c3aed;
  color: #fff;
  border-color: #a78bfa;
}

.node-tool {
  background: #d97706;
  color: #fff;
  border-color: #fbbf24;
}

.node-tool-err {
  background: #dc2626;
  color: #fff;
  border-color: #f87171;
}

.node-output {
  background: #059669;
  color: #fff;
  border-color: #34d399;
}

.node-end {
  background: #0891b2;
  color: #fff;
  border-color: #22d3ee;
}

@keyframes flow-node-in {
  from {
    opacity: 0;
    transform: scale(0.88) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes flow-node-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);
  }
}
</style>
