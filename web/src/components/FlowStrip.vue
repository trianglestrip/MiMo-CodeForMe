<script setup lang="ts">
import { computed } from 'vue'
import { flowNodeClass } from '@/lib/partPhase'
import { mermaidShapeClass } from '@/lib/mermaidShapes'
import { buildFlowSegments, visibleFlowSteps } from '@/lib/flowSegments'
import { activityIconClass, toolStatusIconClass } from '@/lib/phaseIcons'
import type { FlowStepView } from '@/lib/flowSegments'
import type { ActivityStep } from '@/stores/chat'

const props = defineProps<{
  activities: ActivityStep[]
  active?: boolean
  done?: boolean
  embedded?: boolean
}>()

const flowSteps = computed(() => visibleFlowSteps(props.activities, props.active))
const flowSegments = computed(() => buildFlowSegments(flowSteps.value))

const lastFlowKey = computed(() =>
  flowSteps.value.length ? flowSteps.value[flowSteps.value.length - 1].key : null,
)

const endCompactLines: [string, string] = ['流程', '完成']

function isNodeNew(step: FlowStepView) {
  return (
    props.active &&
    step.status === 'running' &&
    step.key === lastFlowKey.value
  )
}
</script>

<template>
  <div class="flow-strip" :class="{ active, done, embedded }">
    <div class="section-label flow-label">调用流程</div>
    <div class="flow-strip-track">
      <template v-if="flowSegments.length">
        <template v-for="(segment, segIdx) in flowSegments" :key="segment.kind === 'round' ? `round-${segment.round}` : segment.step.key">
          <span v-if="segIdx > 0" class="flow-arrow" aria-hidden="true">→</span>

          <div v-if="segment.kind === 'round'" class="flow-round-box">
            <span class="flow-round-tag">推理 {{ segment.round }}</span>
            <div class="flow-round-body">
              <template v-for="(step, stepIdx) in segment.steps" :key="step.key">
                <span v-if="stepIdx > 0" class="flow-arrow" aria-hidden="true">→</span>
                <div
                  class="flow-node"
                  :class="[
                    `phase-${step.cls}`,
                    flowNodeClass(step.cls, step.subOk),
                    mermaidShapeClass(step.mermaidShape),
                    {
                      'shape-dashed': step.shapeDashed,
                      'node-new': isNodeNew(step),
                      'node-running': step.status === 'running',
                      'node-done': step.status === 'done',
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
                      <i class="flow-icon" :class="activityIconClass(step.cls, step.key, step.label)" aria-hidden="true" />
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
              </template>
            </div>
          </div>

          <div v-else class="flow-step-group">
            <div
              class="flow-node"
              :class="[
                `phase-${segment.step.cls}`,
                flowNodeClass(segment.step.cls, segment.step.subOk),
                mermaidShapeClass(segment.step.mermaidShape),
                {
                  'shape-dashed': segment.step.shapeDashed,
                  'node-new': isNodeNew(segment.step),
                  'node-running': segment.step.status === 'running',
                  'node-done': segment.step.status === 'done',
                },
              ]"
              :title="segment.step.label"
            >
              <span v-if="segment.step.compactLines" class="flow-node-compact">
                <span class="compact-line">{{ segment.step.compactLines[0] }}</span>
                <span class="compact-line">{{ segment.step.compactLines[1] }}</span>
              </span>
              <span v-else class="flow-node-inner">
                <span class="flow-node-text">
                  <i class="flow-icon" :class="activityIconClass(segment.step.cls, segment.step.key, segment.step.label)" aria-hidden="true" />
                  {{ segment.step.label }}
                  <i
                    v-if="segment.step.cls === 'tool' && toolStatusIconClass(segment.step.status)"
                    class="flow-status-icon"
                    :class="toolStatusIconClass(segment.step.status)!"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </div>
          </div>
        </template>
      </template>
      <span v-else-if="active" class="flow-wait">等待执行…</span>
      <div v-if="done" class="flow-step-group">
        <span v-if="flowSegments.length" class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-node phase-step node-step shape-stadium node-done">
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
  overflow: hidden;
  animation: flow-node-in 0.35s ease-out both;
  text-align: center;
  font-size: 11px;
  position: relative;
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
  font-size: 0.95em;
}

.flow-status-icon {
  margin-left: 0.25em;
  font-size: 0.85em;
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
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--phase-fg, var(--accent)) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--phase-fg, var(--accent)) 50%, transparent);
  }
}
</style>
