<script setup lang="ts">
import { computed } from 'vue'
import { activityFlowLabel } from '@/lib/flowLabels'
import { flowNodeClass } from '@/lib/partPhase'
import { flowMermaidShape, mermaidShapeClass, isCompactMermaidShape } from '@/lib/mermaidShapes'
import { flowCompactLines } from '@/lib/flowCompactLabels'
import { phaseIconClass, toolStatusIconClass } from '@/lib/phaseIcons'
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
    .map((a) => {
      const mermaidShape = flowMermaidShape(a.phase, a.key, a.label)
      return {
        key: a.key,
        cls: a.phase,
        label: activityFlowLabel(a.phase, a.label, a.status),
        status: a.status,
        subOk: a.phase === 'tool' ? a.status !== 'error' : undefined,
        mermaidShape,
        compactLines: isCompactMermaidShape(mermaidShape)
          ? flowCompactLines(mermaidShape, a.key, a.label)
          : null,
        shapeDashed: a.phase === 'system' && mermaidShape === 'rounded',
      }
    }),
)

const endCompactLines: [string, string] = ['流程', '完成']
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
              mermaidShapeClass(step.mermaidShape),
              {
                'shape-dashed': step.shapeDashed,
                'node-new': index === flowSteps.length - 1 && active && step.status === 'running',
                'node-running': step.status === 'running',
              },
            ]"
            :title="step.label"
          >
            <span v-if="step.compactLines" class="flow-node-compact">
              <span class="compact-line">{{ step.compactLines[0] }}</span>
              <span class="compact-line">{{ step.compactLines[1] }}</span>
            </span>
            <span v-else class="flow-node-inner">
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
            </span>
          </div>
        </div>
      </template>
      <span v-else-if="active" class="flow-wait">等待执行…</span>
      <div v-if="done" class="flow-step-group">
        <span v-if="flowSteps.length" class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-node node-end shape-stadium">
          <span class="flow-node-compact">
            <span class="compact-line">{{ endCompactLines[0] }}</span>
            <span class="compact-line">{{ endCompactLines[1] }}</span>
          </span>
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
  border-radius: var(--radius-sm);
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
  gap: 4px 8px;
  padding: 2px 0;
}

.flow-step-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
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
  justify-content: center;
  max-width: 152px;
  min-height: 28px;
  padding: 6px 10px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  animation: flow-node-in 0.35s ease-out both;
  text-align: center;
  font-size: 11px;
  position: relative;
}

.flow-node.node-running {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--phase-fg, var(--accent)) 28%, transparent);
}

.flow-node-inner {
  display: block;
  width: 100%;
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

.flow-node-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  line-height: 1.12;
  width: 100%;
  position: relative;
  z-index: 1;
}

.compact-line {
  display: block;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
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
  width: 12px;
  height: 28px;
  color: var(--text-3);
  font-size: 12px;
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
