<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

withDefaults(defineProps<{ rows?: number }>(), { rows: 6 })
</script>

<template>
  <div class="conv-sk">
    <div v-for="i in rows" :key="i" class="conv-sk-row">
      <SkeletonBlock width="18px" height="18px" radius="50%" />
      <SkeletonBlock :width="`${58 + (i % 3) * 12}%`" height="13px" />
    </div>
  </div>
</template>

<style scoped>
.conv-sk {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
}

.conv-sk-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}
</style>
