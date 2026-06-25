import { authHeader, apiUrl, mimoConfig, withDirectory } from './config'
import { fetchWithTimeout } from './fetch'
import type { MessageAttachment } from '@/lib/composer/attachments'

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
    `MiMo serve 未就绪（${cfg.baseUrl}）。请确认：1) 已运行 distWebServer\\start.bat（8000/9000）或 script\\start-mimo-web.bat（7000/9000）；2) MiMo API 窗口无报错；3) 使用正确地址打开页面`,
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

export type PromptPart =
  | { type: 'text'; text: string }
  | { type: 'file'; mime: string; url: string; filename?: string }

export function buildPromptParts(
  text: string,
  attachments: Pick<MessageAttachment, 'filename' | 'mime' | 'url'>[] = [],
): PromptPart[] {
  const parts: PromptPart[] = []
  const trimmed = text.trim()
  if (trimmed) parts.push({ type: 'text', text: trimmed })
  for (const file of attachments) {
    parts.push({
      type: 'file',
      mime: file.mime,
      url: file.url,
      filename: file.filename,
    })
  }
  if (!parts.length) parts.push({ type: 'text', text: '请分析这些附件' })
  return parts
}

export async function promptAsync(
  sessionID: string,
  message: string,
  directory: string,
  attachments: Pick<MessageAttachment, 'filename' | 'mime' | 'url'>[] = [],
): Promise<void> {
  const res = await fetchWithTimeout(
    withDirectory(`/session/${encodeURIComponent(sessionID)}/prompt_async`, directory),
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parts: buildPromptParts(message, attachments) }),
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
  info?: {
    role?: string
    id?: string
    finish?: string
    tokens?: Record<string, unknown>
    time?: { completed?: number }
  }
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

