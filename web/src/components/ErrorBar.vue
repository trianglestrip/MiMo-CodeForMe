<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="error-bar">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    {{ message }}
    <button type="button" @click="emit('dismiss')">✕</button>
  </div>
</template>

<style scoped>
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(248, 113, 113, 0.1);
  border-top: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--error);
  font-size: 13px;
  flex-shrink: 0;
}

.error-bar button {
  margin-left: auto;
  color: var(--error);
  opacity: 0.7;
}

.error-bar button:hover {
  opacity: 1;
}
</style>
