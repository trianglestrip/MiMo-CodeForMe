<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { phaseTagIconClass } from '@/lib/phaseIcons'
import type { TraceStep } from '../types'

const props = defineProps<{
  step: TraceStep
}>()

const previewOpen = ref<string[]>(['preview'])

watch(
  () => props.step.live,
  (live) => {
    if (live) previewOpen.value = ['preview']
  },
)

const subTagType = computed(() => {
  if (props.step.subOk === true) return 'success' as const
  if (props.step.subOk === false) return 'danger' as const
  return 'info' as const
})

const showPreview = computed(
  () => props.step.text && (props.step.text.trim() || !props.step.done),
)
</script>

<template>
  <div class="trace-step" :class="`step-${step.cls}`">
    <div class="step-line">
      <span class="step-num">{{ step.num }}</span>
      <div class="step-main">
      <div class="step-title">
        <ElTag size="small" :class="`phase-tag phase-${step.cls}`">
          <i :class="phaseTagIconClass(step.cls, step.key, step.title)" class="tag-icon" aria-hidden="true" />
          {{ step.tag }}
        </ElTag>
        <span class="step-head-text">{{ step.title }}</span>
      </div>

      <ElText v-if="step.intent" tag="div" type="info" size="small" class="step-intent">
        {{ step.intent }}
      </ElText>

      <ElText v-if="step.inputLine" tag="div" class="step-input">{{ step.inputLine }}</ElText>

      <ElCollapse v-if="showPreview" v-model="previewOpen" class="step-collapse">
        <ElCollapseItem name="preview" title="输出">
          <pre
            class="step-preview"
            :class="{ live: step.live, hidden: !step.text.trim() && step.done }"
          >{{ step.text }}</pre>
        </ElCollapseItem>
      </ElCollapse>

      <ElTag v-if="step.sub" :type="subTagType" size="small" class="step-sub">
        {{ step.sub }}
      </ElTag>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.step-num {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  font-size: 9px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  background: var(--bg-3);
  color: var(--text-2);
}

.step-main {
  flex: 1;
  min-width: 0;
}

.step-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--text);
}

.phase-tag {
  height: 20px;
  padding: 0 5px;
  font-size: 10px;
}

.phase-tag .tag-icon {
  margin-right: 0.2em;
  font-size: 0.85em;
}

.step-head-text {
  flex: 1;
  min-width: 0;
}

.step-intent {
  display: block;
  margin-top: 2px;
  line-height: 1.4;
  font-size: 11px;
}

.step-input {
  display: block;
  margin-top: 4px;
  padding: 4px 6px;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-family: var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
  border: none;
}

.step-collapse {
  margin-top: 4px;
  border: none;
}

.step-collapse :deep(.el-collapse-item__header) {
  font-size: 11px;
  height: 26px;
  line-height: 26px;
  border: none;
  min-height: 26px;
}

.step-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.step-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.step-preview {
  margin: 0;
  padding: 6px 8px;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-2);
  max-height: 160px;
  overflow-y: auto;
}

.step-preview.live {
  color: var(--text);
}

.step-preview.live::after {
  content: '▌';
  animation: trace-blink 1s step-end infinite;
  color: var(--accent);
}

.step-preview.hidden {
  display: none;
}

.step-sub {
  margin-top: 4px;
  max-width: 100%;
  height: auto;
  white-space: normal;
  line-height: 1.35;
  font-size: 10px;
}

@keyframes trace-blink {
  50% {
    opacity: 0;
  }
}
</style>
