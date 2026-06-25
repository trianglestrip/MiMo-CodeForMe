<script setup lang="ts">
withDefaults(
  defineProps<{
    titleMaxWidth?: string
  }>(),
  { titleMaxWidth: '420px' },
)
</script>

<template>
  <ElHeader class="shell-header app-header">
    <div class="header-left">
      <ElBreadcrumb v-if="$slots.breadcrumb" separator="/" class="header-breadcrumb">
        <slot name="breadcrumb" />
      </ElBreadcrumb>
      <template v-else>
        <span class="header-title" :style="{ maxWidth: titleMaxWidth }">
          <slot name="title" />
        </span>
      </template>
      <span v-if="$slots.subtitle" class="header-subtitle">
        <slot name="subtitle" />
      </span>
    </div>
    <div v-if="$slots.nav" class="header-nav">
      <slot name="nav" />
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </ElHeader>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  flex: 1;
}

.header-breadcrumb {
  font-size: 14px;
  line-height: 1.4;
}

.header-breadcrumb :deep(.el-breadcrumb__inner) {
  color: var(--text-2);
  font-weight: 500;
}

.header-breadcrumb :deep(.el-breadcrumb__inner a) {
  color: var(--accent);
  font-weight: 400;
}

.header-breadcrumb :deep(.el-breadcrumb__inner a:hover) {
  color: var(--accent-hover);
}

.header-breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--text);
  font-weight: 500;
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

.header-nav {
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
