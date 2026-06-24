declare const __DEFAULT_MIMO_WORK_DIR__: string

declare global {
  interface Window {
    MIMO_TRACE_CONFIG?: {
      baseUrl?: string
      username?: string
      password?: string
      workDir?: string
    }
  }
}

export function mimoConfig() {
  const trace = typeof window !== 'undefined' ? window.MIMO_TRACE_CONFIG : undefined
  const raw = import.meta.env.VITE_MIMO_WORK_DIR?.trim()
  const workDir =
    trace?.workDir?.trim() ||
    (raw && raw !== '..' ? raw : __DEFAULT_MIMO_WORK_DIR__)
  const baseUrl =
    trace?.baseUrl?.trim() ||
    (import.meta.env.DEV
      ? '/mimo'
      : (import.meta.env.VITE_MIMO_SERVER_URL ?? 'http://127.0.0.1:4096').replace(/\/$/, ''))
  return {
    baseUrl,
    username: trace?.username ?? import.meta.env.VITE_MIMO_SERVER_USER ?? 'mimocode',
    password: trace?.password ?? import.meta.env.VITE_MIMO_SERVER_PASSWORD ?? 'mimocode-standalone',
    workDir: workDir.replace(/\\/g, '/'),
  }
}

function resolveBaseUrl(baseUrl: string): string {
  if (baseUrl.startsWith('/')) return `${window.location.origin}${baseUrl}`.replace(/\/$/, '')
  return baseUrl
}

export function apiUrl(path: string): string {
  return `${resolveBaseUrl(mimoConfig().baseUrl)}${path}`
}

export function authHeader(): string {
  const cfg = mimoConfig()
  return `Basic ${btoa(`${cfg.username}:${cfg.password}`)}`
}

export function withDirectory(path: string, directory?: string): string {
  const cfg = mimoConfig()
  const dir = directory || cfg.workDir
  const url = new URL(`${resolveBaseUrl(cfg.baseUrl)}${path}`)
  if (dir) url.searchParams.set('directory', dir)
  return url.toString()
}
