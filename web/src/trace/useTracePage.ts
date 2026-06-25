import { onMounted, onUnmounted, ref } from 'vue'
import { getWorkDir, WORK_DIR_CHANGED } from '@/lib/workDir'
import { subscribeMimoEvents } from '@/lib/mimo/eventStream'
import { latestSessionIdFromMap, SESSION_MAP_KEY, SESSION_MAP_CHANGED } from '@/lib/sessionMap'
import { createTraceEngine } from './traceEngine'
import { sessionPageUrl } from './utils'
import { useAsyncTraceSidebar } from '@/composables/trace/useAsyncTraceSidebar'
import { useAsyncTraceTimeline } from '@/composables/trace/useAsyncTraceTimeline'

export function useTracePage() {
  const engine = createTraceEngine(getWorkDir)

  const connMeta = ref('connecting…')
  const sidebar = useAsyncTraceSidebar(engine)
  const timeline = useAsyncTraceTimeline(engine)

  let streamAbort: AbortController | null = null
  let storageTimer: ReturnType<typeof setInterval> | null = null

  async function navigateToSession(sessionID: string) {
    if (sessionID === engine.activeSessionID.value) return
    engine.navigateToSession(sessionID)
    await timeline.loadSession(sessionID)
  }

  function connectStream() {
    streamAbort?.abort()
    streamAbort = new AbortController()
    const directory = getWorkDir()
    if (!directory) {
      connMeta.value = '请先在顶部设置工作目录'
      return
    }
    connMeta.value = '订阅 /event …'

    void (async () => {
      while (!streamAbort?.signal.aborted) {
        try {
          await subscribeMimoEvents(
            directory,
            (raw) => engine.handleEvent(raw),
            streamAbort!.signal,
            () => {
              connMeta.value =
                '已连接 · ' +
                (engine.activeSessionID.value
                  ? `session ${engine.activeSessionID.value.slice(-8)}`
                  : '选择对话')
            },
          )
        } catch (e) {
          if (streamAbort?.signal.aborted) return
          const msg = e instanceof Error ? e.message : String(e)
          connMeta.value = `SSE 断开: ${msg} · 3s 重连`
          await new Promise((r) => setTimeout(r, 3000))
        }
      }
    })()
  }

  function onWorkDirChanged() {
    connectStream()
  }

  onMounted(async () => {
    const map = await sidebar.bootstrap

    const sid =
      engine.activeSessionID.value || latestSessionIdFromMap(map)
    if (sid && sid !== engine.activeSessionID.value) {
      engine.setActiveSession(sid)
      history.replaceState({ session: sid }, '', sessionPageUrl(sid))
    }
    await timeline.loadSession(sid)

    window.addEventListener('storage', onStorage)
    window.addEventListener(SESSION_MAP_CHANGED, onSessionMapChanged)
    window.addEventListener('popstate', onPopState)
    window.addEventListener(WORK_DIR_CHANGED, onWorkDirChanged)
    storageTimer = setInterval(() => {
      void sidebar.refresh()
    }, 3000)
    connectStream()

    if (new URLSearchParams(location.search).get('simulate') === '1') {
      engine.runSimulation()
      connMeta.value = '模拟模式'
      timeline.hint.value = ''
      timeline.ready.value = true
    }
  })

  function applySessionMap(map: Record<string, { sessionId?: string; title?: string; updatedAt?: number; createdAt?: number }>) {
    engine.syncFromStorageMap(map)
    const urlSid = new URLSearchParams(location.search).get('session')
    if (urlSid) {
      if (urlSid !== engine.activeSessionID.value) void navigateToSession(urlSid)
      return
    }
    if (!engine.activeSessionID.value) {
      const latest = latestSessionIdFromMap(map)
      if (latest) void navigateToSession(latest)
    }
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== SESSION_MAP_KEY || !e.newValue) return
    try {
      applySessionMap(JSON.parse(e.newValue))
    } catch {
      // ignore
    }
  }

  function onSessionMapChanged() {
    void sidebar.refresh().then(applySessionMap)
  }

  function onPopState() {
    const next = new URLSearchParams(location.search).get('session')
    void timeline.loadSession(next)
  }

  onUnmounted(() => {
    streamAbort?.abort()
    if (storageTimer) clearInterval(storageTimer)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SESSION_MAP_CHANGED, onSessionMapChanged)
    window.removeEventListener('popstate', onPopState)
    window.removeEventListener(WORK_DIR_CHANGED, onWorkDirChanged)
  })

  if (import.meta.env.DEV) {
    ;(window as unknown as { __traceHandleEvent: typeof engine.handleEvent }).__traceHandleEvent =
      engine.handleEvent.bind(engine)
    ;(window as unknown as { __traceGetSnapshot: typeof engine.getSnapshot }).__traceGetSnapshot =
      engine.getSnapshot.bind(engine)
    ;(window as unknown as { __traceRunSimulation: typeof engine.runSimulation }).__traceRunSimulation =
      engine.runSimulation.bind(engine)
  }

  return {
    engine,
    connMeta,
    sidebarReady: sidebar.ready,
    timelineReady: timeline.ready,
    emptyHint: timeline.hint,
    navigateToSession,
  }
}
