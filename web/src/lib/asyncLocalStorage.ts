/** 让出主线程，避免大块 JSON 序列化/解析阻塞 UI */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 48 })
      return
    }
    setTimeout(resolve, 0)
  })
}

export async function readJsonAsync<T>(key: string): Promise<T | null> {
  await yieldToMain()
  const raw = localStorage.getItem(key)
  if (!raw) return null
  await yieldToMain()
  return JSON.parse(raw) as T
}

const pending = new Map<string, unknown>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let drainChain: Promise<void> = Promise.resolve()

async function drainWrites() {
  await yieldToMain()
  const batch = new Map(pending)
  pending.clear()
  for (const [key, value] of batch) {
    const json = JSON.stringify(value)
    await yieldToMain()
    localStorage.setItem(key, json)
  }
}

function scheduleDrain() {
  drainChain = drainChain.then(() => drainWrites())
  return drainChain
}

/** 异步写入（合并同 key 的连续更新，只保留最新值） */
export function scheduleWriteJson(key: string, value: unknown): Promise<void> {
  pending.set(key, value)
  if (flushTimer) return drainChain
  flushTimer = setTimeout(() => {
    flushTimer = null
    void scheduleDrain()
  }, 0)
  return drainChain
}

/** 立即排队写入并等待完成（用于轮次结束、新建对话等关键节点） */
export async function flushWriteJson(key: string, value: unknown): Promise<void> {
  pending.set(key, value)
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  await scheduleDrain()
}
