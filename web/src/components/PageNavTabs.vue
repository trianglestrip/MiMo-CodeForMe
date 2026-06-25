<script setup lang="ts">
const props = defineProps<{
  active: 'chat' | 'trace'
  traceHref?: string
}>()

function onTab(name: string | number) {
  if (name === 'chat') {
    if (location.pathname !== '/' && !location.pathname.endsWith('/index.html')) {
      location.href = '/'
    }
    return
  }
  if (name === 'trace') {
    const href = props.traceHref ?? '/trace.html'
    if (location.pathname !== '/trace.html') location.href = href
  }
}
</script>

<template>
  <ElTabs :model-value="active" class="page-nav-tabs" @tab-change="onTab">
    <ElTabPane label="聊天" name="chat" />
    <ElTabPane label="Trace" name="trace" />
  </ElTabs>
</template>

<style scoped>
.page-nav-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.page-nav-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.page-nav-tabs :deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
  font-size: 13px;
}
</style>
