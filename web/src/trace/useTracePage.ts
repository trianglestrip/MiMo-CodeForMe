import { onMounted, onUnmounted, ref } from 'vue'
import { getWorkDir, WORK_DIR_CHANGED } from '@/lib/workDir'
import { fetchSessionMessages, type SessionMessage } from '@/lib/mimo/client'
import { subscribeMimoEvents } from '@/lib/mimo/eventStream'
import { SESSION_MAP_KEY } from './constants'
import { createTraceEngine } from './traceEngine'
import { sessionPageUrl } from './utils'

export function useTracePage() {
  const engine = createTraceEngine(getWorkDir)

  const connMeta = ref('connecting…')
  const emptyHint = ref('请从左侧选择对话')

  let streamAbort: AbortController | null = null
  let storageTimer: ReturnType<typeof setInterval> | null = null

  async function fetchAndReplay(sessionID: string) {
    const directory = getWorkDir()
    if (!directory) {
      emptyHint.value = '请先在顶部设置工作目录'
      return
    }
    const ses = engine.getSession(sessionID)
    if (ses.loaded && ses.timeline.length) return
    if (ses.timeline.length) {
      ses.loaded = true
      return
    }
    emptyHint.value = '加载中…'
    try {
      const messages = (await fetchSessionMessages(sessionID, directory)) as SessionMessage[]
      if (ses.timeline.length) return
      if (Array.isArray(messages) && messages.length) {
        engine.replaySessionMessages(sessionID, messages)
        emptyHint.value = ''
        return
      }
      emptyHint.value = '该对话暂无消息，发送后将在此显示'
      ses.loaded = true
    } catch {
      emptyHint.value = '无法加载该对话'
    }
  }

  async function openSession(sessionID: string | null) {
    engine.setActiveSession(sessionID)
    if (!sessionID) {
      emptyHint.value = '请从左侧选择对话'
      return
    }
    const ses = engine.getSession(sessionID)
    if (ses.timeline.length) {
      emptyHint.value = ''
      return
    }
    await fetchAndReplay(sessionID)
  }

  async function navigateToSession(sessionID: string) {
    if (sessionID === engine.activeSessionID.value) return
    engine.navigateToSession(sessionID)
    await openSession(sessionID)
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

  function loadSidebarFromStorage() {
    try {
      const map = JSON.parse(localStorage.getItem(SESSION_MAP_KEY) || '{}') as Record<
        string,
        { sessionId?: string; title?: string; updatedAt?: number; createdAt?: number }
      >
      engine.syncFromStorageMap(map)
    } catch {
      // ignore
    }
  }

  onMounted(async () => {
    loadSidebarFromStorage()

    let sid = engine.activeSessionID.value || engine.latestSessionIdFromStorage()
    if (sid && sid !== engine.activeSessionID.value) {
      engine.setActiveSession(sid)
      history.replaceState({ session: sid }, '', sessionPageUrl(sid))
    }
    await openSession(sid)

    window.addEventListener('storage', onStorage)
    window.addEventListener('popstate', onPopState)
    window.addEventListener(WORK_DIR_CHANGED, onWorkDirChanged)
    storageTimer = setInterval(loadSidebarFromStorage, 3000)
    connectStream()

    if (new URLSearchParams(location.search).get('simulate') === '1') {
      engine.runSimulation()
      connMeta.value = '模拟模式'
      emptyHint.value = ''
    }
  })

  function onStorage(e: StorageEvent) {
    if (e.key !== SESSION_MAP_KEY || !e.newValue) return
    try {
      engine.syncFromStorageMap(JSON.parse(e.newValue))
    } catch {
      // ignore
    }
    const latest = engine.latestSessionIdFromStorage()
    if (!engine.activeSessionID.value && latest) void navigateToSession(latest)
  }

  function onPopState() {
    const next = new URLSearchParams(location.search).get('session')
    void openSession(next)
  }

  onUnmounted(() => {
    streamAbort?.abort()
    if (storageTimer) clearInterval(storageTimer)
    window.removeEventListener('storage', onStorage)
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
    emptyHint,
    navigateToSession,
  }
}
