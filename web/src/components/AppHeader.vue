<script setup lang="ts">
withDefaults(
  defineProps<{
    titleMaxWidth?: string
  }>(),
  { titleMaxWidth: '420px' },
)
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <span class="header-title" :style="{ maxWidth: titleMaxWidth }">
        <slot name="title" />
      </span>
      <span v-if="$slots.subtitle" class="header-subtitle">
        <slot name="subtitle" />
      </span>
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-subtitle {
  font-size: 11px;
  color: var(--text-3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
