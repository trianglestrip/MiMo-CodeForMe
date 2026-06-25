<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import NavLinkButton from '@/components/NavLinkButton.vue'
import ServiceStatus from '@/components/ServiceStatus.vue'
import WorkDirSelector from '@/components/WorkDirSelector.vue'
import QuestionNavFab from '@/components/QuestionNavFab.vue'
import TraceSidebar from './components/TraceSidebar.vue'
import TraceTurnView from './components/TraceTurnView.vue'
import { useTracePage } from './useTracePage'

const { engine, connMeta, emptyHint, navigateToSession } = useTracePage()

const timelineEl = ref<HTMLElement | null>(null)

const sortedSessions = engine.sortedSessions
const activeSession = engine.activeSession
const activeSessionID = engine.activeSessionID

const pageTitle = computed(
  () => activeSession.value?.title || 'BcAI Trace',
)

const questionNavItems = computed(() =>
  (activeSession.value?.timeline ?? []).map((turn) => ({
    id: turn.id,
    label: turn.question.trim() || '（空）',
  })),
)
</script>

<template>
  <div class="trace-page">
    <AppHeader>
      <template #title>{{ pageTitle }}</template>
      <template v-if="connMeta" #subtitle>{{ connMeta }}</template>
      <template #actions>
        <WorkDirSelector />
        <NavLinkButton href="/" title="返回聊天">聊天</NavLinkButton>
        <ServiceStatus />
      </template>
    </AppHeader>

    <main class="trace-main">
      <TraceSidebar
        :sessions="sortedSessions"
        :active-session-id="activeSessionID"
        @select="navigateToSession"
      />
      <section ref="timelineEl" class="timeline">
        <div v-if="!activeSession" class="empty">{{ emptyHint }}</div>
        <template v-else-if="activeSession.timeline.length">
          <div class="session-block">
            <div class="session-head">
              <div><strong>{{ activeSession.title }}</strong></div>
              <div class="sid">session · {{ activeSession.shortId }}</div>
            </div>
            <TraceTurnView v-for="turn in activeSession.timeline" :key="turn.id" :turn="turn" />
          </div>
        </template>
        <div v-else class="empty">{{ emptyHint || '该对话暂无消息，发送后将在此显示' }}</div>
      </section>
    </main>

    <QuestionNavFab :items="questionNavItems" :scroll-root="timelineEl" />
  </div>
</template>

<style scoped>
.trace-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}
</style>
