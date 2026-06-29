<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="trace-sk-timeline">
    <SkeletonBlock class="trace-sk-head" height="52px" radius="var(--radius-sm)" />
    <div v-for="i in 2" :key="i" class="trace-sk-turn">
      <SkeletonBlock width="48%" height="16px" />
      <SkeletonBlock width="88%" height="12px" />
      <SkeletonBlock width="72%" height="12px" />
      <SkeletonBlock width="36%" height="28px" radius="var(--radius-sm)" />
    </div>
  </div>
</template>

<style scoped>
.trace-sk-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 48px;
}

.trace-sk-head {
  margin-bottom: 4px;
}

.trace-sk-turn {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-2);
}
</style>
