<script setup lang="ts">
import type { TraceSession } from '../types'
import { formatSessionDateRange } from '../utils'

defineProps<{
  sessions: TraceSession[]
  activeSessionId: string | null
}>()

const emit = defineEmits<{
  select: [sessionID: string]
}>()

function onSelect(id: string) {
  emit('select', id)
}
</script>

<template>
  <ElContainer direction="vertical" class="trace-sidebar">
    <ElHeader class="shell-header sidebar-top">
      <ElText tag="p" size="small" type="info" class="conv-title">对话列表</ElText>
    </ElHeader>

    <ElMain class="shell-main list-main">
      <ElScrollbar class="conv-list">
        <ElEmpty v-if="!sessions.length" description="暂无对话" :image-size="48" />
        <ElMenu
          v-else
          :key="activeSessionId ?? ''"
          :default-active="activeSessionId ?? ''"
          class="conv-menu"
          @select="onSelect"
        >
          <ElMenuItem v-for="ses in sessions" :key="ses.id" :index="ses.id">
            <div class="ses-row">
              <span class="q">{{ ses.title }}</span>
              <span class="meta">
                {{ formatSessionDateRange(ses.createdAt, ses.updatedAt) }} · {{ ses.turns }} 轮
              </span>
            </div>
          </ElMenuItem>
        </ElMenu>
      </ElScrollbar>
    </ElMain>

    <ElFooter class="shell-footer sidebar-bottom">
      <ElAlert type="info" :closable="false" show-icon title="如何知道目录里有什么？">
        Web 在顶部设置工作目录并传给后端；Agent 调用 <code>read</code> / <code>glob</code> / <code>bash</code>
        等工具扫描该目录，再根据 listing 组织回答。
      </ElAlert>
    </ElFooter>
  </ElContainer>
</template>

<style scoped>
.trace-sidebar {
  height: 100%;
  padding: 0;
}

.sidebar-top {
  padding: 16px 16px 0;
  background: transparent;
}

.conv-title {
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.list-main {
  padding: 8px 16px;
}

.conv-menu {
  border-right: none;
  background: transparent;
}

.conv-menu :deep(.el-menu-item) {
  height: auto;
  min-height: 44px;
  line-height: 1.45;
  padding: 8px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  white-space: normal;
}

.conv-menu :deep(.el-menu-item.is-active) {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.ses-row {
  width: 100%;
  min-width: 0;
}

.q {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.meta {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  margin-top: 4px;
}

.sidebar-bottom {
  padding: 0 16px 16px;
  background: transparent;
}

.sidebar-bottom :deep(code) {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-3);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
</style>
