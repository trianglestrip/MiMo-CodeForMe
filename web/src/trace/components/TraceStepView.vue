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
  <ElTimelineItem class="flow-step" :class="`step-${step.cls}`">
    <template #dot>
      <ElTag round size="small" class="step-num">{{ step.num }}</ElTag>
    </template>

    <div class="step-main">
      <div class="step-title">
        <ElTag size="small" :class="`phase-tag phase-${step.cls}`">
          <i :class="phaseTagIconClass(step.cls)" class="tag-icon" aria-hidden="true" />
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
  </ElTimelineItem>
</template>

<style scoped>
.step-num {
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
}

.step-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

.phase-tag .tag-icon {
  margin-right: 0.25em;
  font-size: 0.9em;
}

.step-head-text {
  flex: 1;
  min-width: 0;
}

.step-intent {
  display: block;
  margin-top: 4px;
  line-height: 1.5;
}

.step-input {
  display: block;
  margin-top: 6px;
  padding: 6px 8px;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
}

.step-collapse {
  margin-top: 6px;
  border: none;
}

.step-collapse :deep(.el-collapse-item__header) {
  font-size: 12px;
  height: 32px;
  line-height: 32px;
  border: none;
}

.step-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.step-preview {
  margin: 0;
  padding: 8px 10px;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-2);
  max-height: 200px;
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
  margin-top: 6px;
  max-width: 100%;
  height: auto;
  white-space: normal;
  line-height: 1.45;
}

@keyframes trace-blink {
  50% {
    opacity: 0;
  }
}
</style>
