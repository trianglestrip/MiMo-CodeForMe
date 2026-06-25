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
        <TraceSidebarSkeleton v-if="!sidebarReady" />
        <TraceSidebar
          v-else
          :sessions="sortedSessions"
          :active-session-id="activeSessionID"
          @select="navigateToSession"
        />
      </ElAside>

      <ElMain class="shell-main timeline-main">
        <TraceTimelineSkeleton v-if="!timelineReady" />
        <ElScrollbar v-else ref="timelineEl" class="timeline">
          <ElEmpty v-if="!activeSession" :description="emptyHint" />
          <template v-else-if="activeSession.timeline.length">
            <ElCard shadow="never" class="session-head">
              <strong>{{ activeSession.title }}</strong>
              <ElText tag="div" type="info" size="small" class="sid">
                session · {{ activeSession.shortId }}
              </ElText>
            </ElCard>
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
  background: var(--bg-2);
  border-right: 1px solid var(--border);
}

.timeline-main {
  background: var(--bg);
}

.timeline {
  height: 100%;
  padding: 20px 24px 48px;
}

.session-head {
  margin-bottom: 12px;
  background: var(--accent-dim);
}

.session-head :deep(.el-card__body) {
  padding: 10px 14px;
  font-size: 13px;
}

.sid {
  font-family: var(--font-mono);
  margin-top: 4px;
}
</style>
