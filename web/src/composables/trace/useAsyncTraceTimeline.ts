import { ref } from 'vue'
import { getWorkDir } from '@/lib/workDir'
import { fetchSessionMessages, type SessionMessage } from '@/lib/mimo/client'
import { yieldToMain } from '@/lib/asyncLocalStorage'
import type { TraceEngine } from '@/trace/traceEngine'

/** Trace 时间线：按 session 独立异步拉取/回放消息 */
export function useAsyncTraceTimeline(engine: TraceEngine) {
  const ready = ref(false)
  const hint = ref('请从左侧选择对话')

  async function loadSession(sessionID: string | null) {
    ready.value = false
    engine.setActiveSession(sessionID)

    if (!sessionID) {
      hint.value = '请从左侧选择对话'
      ready.value = true
      return
    }

    const ses = engine.getSession(sessionID)
    if (ses.loaded && ses.timeline.length) {
      hint.value = ''
      ready.value = true
      return
    }
    if (ses.timeline.length) {
      hint.value = ''
      ready.value = true
      return
    }

    const directory = getWorkDir()
    if (!directory) {
      hint.value = '请先在顶部设置工作目录'
      ready.value = true
      return
    }

    hint.value = '加载中…'
    await yieldToMain()

    try {
      const messages = (await fetchSessionMessages(sessionID, directory)) as SessionMessage[]
      if (ses.timeline.length) {
        hint.value = ''
        ready.value = true
        return
      }
      if (Array.isArray(messages) && messages.length) {
        engine.replaySessionMessages(sessionID, messages)
        hint.value = ''
        return
      }
      hint.value = '该对话暂无消息，发送后将在此显示'
      ses.loaded = true
    } catch {
      hint.value = '无法加载该对话'
    }

    ready.value = true
  }

  return { ready, hint, loadSession }
}
