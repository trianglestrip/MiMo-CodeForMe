export const WORK_DIR_KEY = 'bcai-work-dir'
export const WORK_DIR_CHANGED = 'bcai-workdir-changed'

declare const __DEFAULT_MIMO_WORK_DIR__: string

function traceConfig() {
  return typeof window !== 'undefined' ? window.MIMO_TRACE_CONFIG : undefined
}

export function normalizeWorkDir(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/\/+$/, '')
}

export function isPathInside(child: string, parent: string): boolean {
  const c = normalizeWorkDir(child).toLowerCase()
  const p = normalizeWorkDir(parent).toLowerCase()
  if (!p || !c) return false
  if (c === p) return true
  return c.startsWith(`${p}/`)
}

export function defaultWorkDir(): string {
  if (typeof __DEFAULT_MIMO_WORK_DIR__ === 'string' && __DEFAULT_MIMO_WORK_DIR__.trim()) {
    return normalizeWorkDir(__DEFAULT_MIMO_WORK_DIR__)
  }
  return ''
}

/** 绿色版 API 允许访问的目录根（mimo serve 的 cwd，通常为 distWebServer/） */
export function configuredWorkDirRoot(): string {
  const trace = traceConfig()
  if (trace?.workDirRoot?.trim()) return normalizeWorkDir(trace.workDirRoot)
  const wd = trace?.workDir?.trim()
  if (!wd) return ''
  const normalized = normalizeWorkDir(wd)
  const slash = normalized.lastIndexOf('/')
  if (slash <= 0) return normalized
  return normalized.slice(0, slash)
}

export function configuredDefaultWorkDir(): string {
  const trace = traceConfig()
  if (trace?.workDir?.trim()) return normalizeWorkDir(trace.workDir)
  const env = import.meta.env.VITE_MIMO_WORK_DIR?.trim()
  if (env && env !== '..') return normalizeWorkDir(env)
  return defaultWorkDir()
}

function resolveWorkDir(): string {
  const root = configuredWorkDirRoot()
  const fallback = configuredDefaultWorkDir()

  try {
    const saved = localStorage.getItem(WORK_DIR_KEY)?.trim()
    if (saved) {
      const normalized = normalizeWorkDir(saved)
      if (!root || isPathInside(normalized, root)) return normalized
    }
  } catch {
    // ignore
  }

  if (fallback) return fallback
  return defaultWorkDir()
}

export function getWorkDir(): string {
  return resolveWorkDir()
}

/** 若 localStorage 中目录超出绿色版允许范围，写回默认值 */
export function ensureWorkDirAllowed(): string {
  const resolved = resolveWorkDir()
  try {
    const saved = localStorage.getItem(WORK_DIR_KEY)?.trim()
    const normalized = saved ? normalizeWorkDir(saved) : ''
    if (normalized !== resolved) {
      localStorage.setItem(WORK_DIR_KEY, resolved)
      window.dispatchEvent(new CustomEvent(WORK_DIR_CHANGED, { detail: resolved }))
    }
  } catch {
    // ignore
  }
  return resolved
}

export function setWorkDir(path: string) {
  const normalized = normalizeWorkDir(path)
  localStorage.setItem(WORK_DIR_KEY, normalized)
  window.dispatchEvent(new CustomEvent(WORK_DIR_CHANGED, { detail: normalized }))
}

export function displayWorkDir(path: string, max = 28): string {
  if (!path) return '未设置工作目录'
  if (path.length <= max) return path
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 2) return `…${path.slice(-max + 1)}`
  return `…/${parts.slice(-2).join('/')}`
}
