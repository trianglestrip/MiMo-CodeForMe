<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="trace-sk-sidebar">
    <SkeletonBlock width="64px" height="12px" />
    <div class="trace-sk-list">
      <div v-for="i in 5" :key="i" class="trace-sk-item">
        <SkeletonBlock :width="`${70 + (i % 2) * 10}%`" height="13px" />
        <SkeletonBlock width="55%" height="10px" />
      </div>
    </div>
    <SkeletonBlock class="trace-sk-alert" height="72px" radius="var(--radius-sm)" />
  </div>
</template>

<style scoped>
.trace-sk-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.trace-sk-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.trace-sk-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.trace-sk-alert {
  flex-shrink: 0;
}
</style>
