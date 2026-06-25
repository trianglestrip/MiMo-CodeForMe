<script setup lang="ts">
import type { StopReason } from '@/stores/chat'
import { stopReasonMessage } from '@/lib/mimo/turnMessages'

defineProps<{
  reason: StopReason
  traceHref?: string
}>()
</script>

<template>
  <ElAlert type="warning" show-icon :closable="false" class="incomplete-notice">
    <template #title>
      <span>{{ stopReasonMessage(reason) }}</span>
      <ElLink v-if="traceHref" :href="traceHref" type="primary" class="trace-link">Trace</ElLink>
    </template>
  </ElAlert>
</template>

<style scoped>
.incomplete-notice {
  margin-top: 10px;
}

.incomplete-notice :deep(.el-alert__title) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.trace-link {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
}
</style>
