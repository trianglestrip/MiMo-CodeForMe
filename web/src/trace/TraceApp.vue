<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScrollbarInstance } from 'element-plus'
import { PRODUCT_NAME } from '@/lib/brand'
import AppHeader from '@/components/AppHeader.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'
import WorkDirSelector from '@/components/WorkDirSelector.vue'
import QuestionNavFab from '@/components/QuestionNavFab.vue'
import TraceSidebar from './components/TraceSidebar.vue'
import TraceTurnView from './components/TraceTurnView.vue'
import TraceSidebarSkeleton from '@/components/skeleton/TraceSidebarSkeleton.vue'
import TraceTimelineSkeleton from '@/components/skeleton/TraceTimelineSkeleton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { formatSessionDateRange } from './utils'
import { useTracePage } from './useTracePage'

const { engine, connMeta, sidebarReady, timelineReady, emptyHint, navigateToSession } = useTracePage()

const timelineEl = ref<ScrollbarInstance | null>(null)

const timelineScrollRoot = computed(() => timelineEl.value?.wrapRef ?? null)

const sortedSessions = engine.sortedSessions
const activeSession = engine.activeSession
const activeSessionID = engine.activeSessionID

const pageTitle = computed(
  () => activeSession.value?.title || `${PRODUCT_NAME} Trace`,
)

const questionNavItems = computed(() =>
  (activeSession.value?.timeline ?? []).map((turn) => ({
    id: turn.id,
    label: turn.question.trim() || '（空）',
  })),
)

</script>

<template>
  <ElContainer direction="vertical" class="trace-page shell-vertical">
    <AppHeader>
      <template #title>{{ pageTitle }}</template>
      <template #actions>
        <WorkDirSelector />
        <ServiceStatus />
      </template>
      <template v-if="connMeta" #subtitle>
        <ElText type="info" size="small" class="conn-meta">{{ connMeta }}</ElText>
      </template>
    </AppHeader>

    <ElContainer class="trace-body">
      <ElAside width="280px" class="shell-aside trace-aside">
        <div class="trace-aside-body">
          <TraceSidebarSkeleton v-if="!sidebarReady" />
          <TraceSidebar
            v-else
            :sessions="sortedSessions"
            :active-session-id="activeSessionID"
            @select="navigateToSession"
          />
        </div>
        <div class="trace-aside-footer">
          <ThemeToggle block />
        </div>
      </ElAside>

      <ElMain class="shell-main timeline-main">
        <TraceTimelineSkeleton v-if="!timelineReady" />
        <ElScrollbar v-else ref="timelineEl" class="timeline">
          <ElEmpty v-if="!activeSession" :description="emptyHint" />
          <template v-else-if="activeSession.timeline.length">
            <div class="session-head" :key="activeSession.id">
              <strong class="session-title">{{ activeSession.title }}</strong>
              <ElText tag="div" type="info" size="small" class="session-meta">
                session · {{ activeSession.shortId }}
                · {{ formatSessionDateRange(activeSession.createdAt, activeSession.updatedAt) }}
                · {{ activeSession.turns }} 轮
              </ElText>
            </div>
            <TraceTurnView v-for="turn in activeSession.timeline" :key="turn.id" :turn="turn" />
          </template>
          <ElEmpty v-else :description="emptyHint || '该对话暂无消息，发送后将在此显示'" />
        </ElScrollbar>
      </ElMain>
    </ElContainer>

    <QuestionNavFab :items="questionNavItems" :scroll-root="timelineScrollRoot" />
  </ElContainer>
</template>

<style scoped>
.trace-page {
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.trace-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.trace-aside {
  display: flex;
  flex-direction: column;
  background: var(--bg-2);
  border-right: 1px solid var(--border);
}

.trace-aside-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.trace-aside-footer {
  flex-shrink: 0;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-3);
}

.trace-aside-footer :deep(.theme-toggle-btn) {
  width: 100%;
  height: 42px;
  font-size: 13px;
  font-weight: 500;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  border: 1px solid var(--border);
  color: var(--text);
}

.trace-aside-footer :deep(.theme-toggle-btn:hover) {
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  color: var(--accent);
}

.timeline-main {
  background: var(--bg);
}

.timeline {
  height: 100%;
  padding: 10px 14px 32px;
}

.session-head {
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
}

.session-title {
  display: block;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text);
}

.session-meta {
  display: block;
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.45;
}
</style>
