export const WORK_DIR_KEY = 'bcai-work-dir'
export const WORK_DIR_CHANGED = 'bcai-workdir-changed'

declare const __DEFAULT_MIMO_WORK_DIR__: string

export function defaultWorkDir(): string {
  if (typeof __DEFAULT_MIMO_WORK_DIR__ === 'string' && __DEFAULT_MIMO_WORK_DIR__.trim()) {
    return __DEFAULT_MIMO_WORK_DIR__.trim().replace(/\\/g, '/')
  }
  return ''
}

export function getWorkDir(): string {
  try {
    const saved = localStorage.getItem(WORK_DIR_KEY)?.trim()
    if (saved) return saved.replace(/\\/g, '/')
  } catch {
    // ignore
  }
  const trace = typeof window !== 'undefined' ? window.MIMO_TRACE_CONFIG?.workDir?.trim() : ''
  if (trace) return trace.replace(/\\/g, '/')
  const env = import.meta.env.VITE_MIMO_WORK_DIR?.trim()
  if (env && env !== '..') return env.replace(/\\/g, '/')
  return defaultWorkDir()
}

export function setWorkDir(path: string) {
  const normalized = path.trim().replace(/\\/g, '/')
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
