import { ref } from 'vue'
import { loadSessionMapAsync } from '@/lib/sessionMap'
import type { TraceEngine } from '@/trace/traceEngine'

/** Trace 侧栏：独立异步加载 session 映射 */
export function useAsyncTraceSidebar(engine: TraceEngine) {
  const ready = ref(false)

  async function refresh() {
    const map = await loadSessionMapAsync()
    engine.syncFromStorageMap(map)
    return map
  }

  const bootstrap = refresh().then((map) => {
    ready.value = true
    return map
  })

  return { ready, refresh, bootstrap }
}
