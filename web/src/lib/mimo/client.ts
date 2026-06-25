import { authHeader, apiUrl, mimoConfig, withDirectory } from './config'
import { fetchWithTimeout } from './fetch'

export type MimoSession = { id: string; title?: string }

export async function waitForMimoReady(timeoutMs = 15_000): Promise<void> {
  const cfg = mimoConfig()
  const deadline = Date.now() + timeoutMs
  const healthUrl = apiUrl('/global/health')
  while (Date.now() < deadline) {
    try {
      const res = await fetchWithTimeout(
        healthUrl,
        { cache: 'no-store', headers: { Authorization: authHeader() } },
        8_000,
      )
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(
    `MiMo serve 未就绪（${cfg.baseUrl}）。请确认：1) 已运行 start.bat 或 start-mimo-web.bat；2) 「MiMo 4096」窗口无报错；3) 使用 http://127.0.0.1:5173 打开页面`,
  )
}

export async function createSession(directory: string): Promise<MimoSession> {
  const res = await fetchWithTimeout(withDirectory('/session', directory), {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    throw new Error(`session.create failed (${res.status}): ${await res.text()}`)
  }
  return res.json() as Promise<MimoSession>
}

export async function promptAsync(sessionID: string, message: string, directory: string): Promise<void> {
  const res = await fetchWithTimeout(
    withDirectory(`/session/${encodeURIComponent(sessionID)}/prompt_async`, directory),
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parts: [{ type: 'text', text: message }] }),
    },
    60_000,
  )
  if (!res.ok && res.status !== 204) {
    throw new Error(`prompt_async failed (${res.status}): ${await res.text()}`)
  }
}

export function eventUrl(directory: string): string {
  return withDirectory('/event', directory)
}

export type SessionMessage = {
  info?: { role?: string; id?: string; tokens?: Record<string, unknown> }
  parts?: Array<{ type?: string; text?: string; id?: string }>
}

export async function fetchSessionMessages(sessionID: string, directory: string): Promise<SessionMessage[]> {
  const res = await fetchWithTimeout(
    withDirectory(`/session/${encodeURIComponent(sessionID)}/message`, directory),
    { headers: { Authorization: authHeader() } },
  )
  if (!res.ok) {
    throw new Error(`session.message failed (${res.status}): ${await res.text()}`)
  }
  return res.json() as Promise<SessionMessage[]>
}

export function userMessageCount(messages: SessionMessage[]): number {
  return messages.filter((m) => m.info?.role === 'user').length
}

export function lastAssistantText(messages: SessionMessage[]): string {
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].info?.role === 'user') {
      lastUserIdx = i
      break
    }
  }
  for (let i = messages.length - 1; i > lastUserIdx; i--) {
    const msg = messages[i]
    if (msg.info?.role !== 'assistant') continue
    const text = (msg.parts ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('')
    if (text.trim()) return text
  }
  return ''
}

export async function pollAssistantReply(
  sessionID: string,
  directory: string,
  userCountBefore: number,
  timeoutMs = 90_000,
  intervalMs = 500,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let sawBusy = false
  let idleSince = 0
  while (Date.now() < deadline) {
    const messages = await fetchSessionMessages(sessionID, directory)
    if (userMessageCount(messages) > userCountBefore) {
      const text = lastAssistantText(messages)
      if (text.trim()) return text
    }

    const statusRes = await fetchWithTimeout(withDirectory('/session/status', directory), {
      headers: { Authorization: authHeader() },
    })
    if (statusRes.ok) {
      const statuses = (await statusRes.json()) as Record<string, { type?: string }>
      const st = statuses[sessionID]
      if (st?.type === 'busy') {
        sawBusy = true
        idleSince = 0
      }
      if (st?.type === 'idle' || st?.type === 'completed' || (sawBusy && !st)) {
        idleSince ||= Date.now()
        if (Date.now() - idleSince > 8_000) {
          return lastAssistantText(messages).trim()
        }
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return ''
}
