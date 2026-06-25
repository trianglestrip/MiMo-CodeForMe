<script setup lang="ts">
import { computed } from 'vue'
import { activityFlowLabel } from '@/lib/flowLabels'
import { flowNodeClass } from '@/lib/partPhase'
import { phaseIconClass, toolStatusIconClass, flowEndIconClass } from '@/lib/phaseIcons'
import type { ActivityStep } from '@/stores/chat'

const props = defineProps<{
  activities: ActivityStep[]
  active?: boolean
  done?: boolean
  embedded?: boolean
}>()

const flowSteps = computed(() =>
  props.activities
    .filter((a) => !(a.key === 'wait' && a.status === 'done'))
    .filter(
      (a) =>
        a.status === 'done' ||
        a.status === 'error' ||
        (props.active && a.status === 'running'),
    )
    .map((a) => ({
      key: a.key,
      cls: a.phase,
      label: activityFlowLabel(a.phase, a.label, a.status),
      status: a.status,
      subOk: a.phase === 'tool' ? a.status !== 'error' : undefined,
    })),
)
</script>

<template>
  <div class="flow-strip" :class="{ active, done, embedded }">
    <div class="section-label flow-label">调用流程</div>
    <div class="flow-strip-track">
      <template v-if="flowSteps.length">
        <div
          v-for="(step, index) in flowSteps"
          :key="step.key"
          class="flow-step-group"
        >
          <span v-if="index > 0" class="flow-arrow" aria-hidden="true">→</span>
          <div
            class="flow-node"
            :class="[
              flowNodeClass(step.cls, step.subOk),
              {
                'node-new': index === flowSteps.length - 1 && active && step.status === 'running',
                'node-running': step.status === 'running',
              },
            ]"
            :title="step.label"
          >
            <span class="flow-node-text">
              <i class="flow-icon" :class="phaseIconClass(step.cls)" aria-hidden="true" />
              {{ step.label }}
              <i
                v-if="step.cls === 'tool' && toolStatusIconClass(step.status)"
                class="flow-status-icon"
                :class="toolStatusIconClass(step.status)!"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </template>
      <span v-else-if="active" class="flow-wait">等待执行…</span>
      <div v-if="done" class="flow-step-group">
        <span v-if="flowSteps.length" class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-node node-end">
          <i :class="flowEndIconClass()" class="flow-icon" aria-hidden="true" />
          完成
        </div>
      </div>
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
  border-radius: 0;
  padding: 8px 10px;
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
  text-align: left;
}

.flow-strip-track {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  justify-content: flex-start;
  gap: 6px;
  padding: 2px 0;
}

.flow-step-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  max-width: 100%;
}

.flow-wait {
  font-size: 12px;
  color: var(--text-3);
}

.flow-node {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  max-width: 152px;
  min-height: 28px;
  padding: 6px 10px;
  border-radius: 0;
  font-size: 11px;
  border: 1.5px solid transparent;
  overflow: hidden;
  animation: flow-node-in 0.35s ease-out both;
  text-align: left;
}

.flow-node.node-running {
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 25%, transparent);
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
  text-align: left;
  width: 100%;
}

.flow-icon {
  margin-right: 0.35em;
  opacity: 0.92;
  font-size: 0.95em;
}

.flow-status-icon {
  margin-left: 0.25em;
  font-size: 0.85em;
  opacity: 0.9;
}

.flow-strip.done .flow-node {
  animation: none;
}

.flow-node.node-new {
  animation: flow-node-in 0.35s ease-out both, flow-node-pulse 1.6s ease-in-out 2;
}

.flow-arrow {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 28px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1;
  user-select: none;
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
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--phase-think) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--phase-think) 35%, transparent);
  }
}
</style>
