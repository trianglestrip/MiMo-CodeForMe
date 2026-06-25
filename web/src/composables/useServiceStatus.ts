import { onMounted, onUnmounted, ref } from 'vue'
import { apiUrl, authHeader, mimoConfig } from '@/lib/mimo/config'

export type LinkStatus = 'checking' | 'ok' | 'fail'

export interface PortStatus {
  label: string
  port: string
  status: LinkStatus
  detail: string
}

const POLL_MS = 20_000

function frontendPort(): string {
  return window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
}

function mimoApiPort(): string {
  const cfg = mimoConfig()
  if (cfg.apiPort) return cfg.apiPort
  if (!cfg.baseUrl.startsWith('/')) return new URL(cfg.baseUrl).port || '9000'
  if (import.meta.env.DEV) {
    const url = import.meta.env.VITE_MIMO_SERVER_URL ?? 'http://127.0.0.1:9000'
    return new URL(url).port || '9000'
  }
  return '9000'
}

async function checkMimo(): Promise<{ ok: boolean; port: string; detail?: string }> {
  const cfg = mimoConfig()
  const port = mimoApiPort()
  try {
    const res = await fetch(apiUrl('/global/health'), {
      cache: 'no-store',
      headers: { Authorization: authHeader() },
    })
    if (res.ok) return { ok: true, port }
    return { ok: false, port, detail: `HTTP ${res.status}` }
  } catch (e) {
    const hint =
      window.location.hostname === 'localhost' || window.location.hostname === '[::1]'
        ? `请改用 http://127.0.0.1:${import.meta.env.DEV ? '7000' : '8000'} 打开（默认 IPv4）`
        : `无法连接 ${cfg.baseUrl}，请运行 distWebServer\\start.bat 或 script\\start-mimo-web.bat`
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, port, detail: `${hint} · ${msg}` }
  }
}

export function useServiceStatus() {
  const api = ref<PortStatus>({
    label: 'API',
    port: mimoApiPort(),
    status: 'checking',
    detail: '检测中…',
  })
  const fe = ref<PortStatus>({
    label: '前端',
    port: frontendPort(),
    status: 'checking',
    detail: '检测中…',
  })

  let timer: ReturnType<typeof setInterval> | null = null
  let initialized = false

  async function refresh() {
    if (!initialized) {
      api.value.status = 'checking'
      fe.value.status = 'checking'
    }
    fe.value.port = frontendPort()

    const mimo = await checkMimo()

    api.value.port = mimo.port
    api.value.status = mimo.ok ? 'ok' : 'fail'
    api.value.detail = mimo.ok
      ? `后端就绪 · ${mimo.port}`
      : mimo.detail ?? `后端未连接 · 请确认 API 窗口（${mimo.port}）已启动 · ${mimo.port}`

    fe.value.status = 'ok'
    fe.value.detail = `前端正常 · ${fe.value.port}`
    initialized = true
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') void refresh()
  }

  onMounted(() => {
    void refresh()
    timer = setInterval(() => void refresh(), POLL_MS)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { api, fe, refresh }
}
