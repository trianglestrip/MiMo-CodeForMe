<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="composer-sk">
    <div class="composer-sk-panel">
      <SkeletonBlock width="40px" height="40px" radius="var(--radius-sm)" />
      <SkeletonBlock class="composer-sk-input" height="40px" radius="var(--radius-sm)" />
      <SkeletonBlock width="40px" height="40px" radius="var(--radius-sm)" />
    </div>
  </div>
</template>

<style scoped>
.composer-sk {
  padding: 12px 32px 14px;
  background: var(--bg-2);
}

.composer-sk-panel {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 860px;
  margin: 0 auto;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

.composer-sk-input {
  flex: 1;
  min-width: 0;
}
</style>
