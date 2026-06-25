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
</script>

<template>
  <aside class="sidebar">
    <div class="conv-title">对话列表</div>
    <div class="conv-list">
      <div v-if="!sessions.length" class="conv-empty">暂无对话</div>
      <a
        v-for="ses in sessions"
        :key="ses.id"
        href="#"
        class="conv-item"
        :class="{ active: ses.id === activeSessionId }"
        @click.prevent="emit('select', ses.id)"
      >
        <span class="q">{{ ses.title }}</span>
        <span class="meta">{{ formatSessionDateRange(ses.createdAt, ses.updatedAt) }} · {{ ses.turns }} 轮</span>
      </a>
    </div>
    <div class="hint">
      <strong>如何知道目录里有什么？</strong><br />
      Web 在顶部设置工作目录并传给 mimo；Agent 调用 <code>read</code> / <code>glob</code> / <code>bash</code>
      等工具扫描该目录，再根据 listing 组织回答。
    </div>
  </aside>
</template>

<style scoped>
.conv-empty {
  color: var(--text-3);
  font-size: 12px;
}

.conv-item .meta {
  font-size: 10px;
  line-height: 1.45;
  white-space: normal;
}
</style>
