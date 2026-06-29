import { authHeader, withDirectory } from './config'
import { fetchWithTimeout } from './fetch'
import type { SessionMessage } from './client'
import { fetchSessionMessages, lastAssistantText, userMessageCount } from './client'

export type PollEndReason = 'completed' | 'idle_early' | 'timeout' | 'aborted'

export type PollResult = {
  text: string
  reason: PollEndReason
  finished: boolean
}

export type PollOptions = {
  timeoutMs?: number
  intervalMs?: number
  idleEarlyMs?: number
  signal?: AbortSignal
}

function assistantHasFinish(messages: SessionMessage[], userCountBefore: number): boolean {
  let users = 0
  for (const msg of messages) {
    if (msg.info?.role === 'user') users++
    if (users <= userCountBefore) continue
    if (msg.info?.role !== 'assistant') continue
    const finish = (msg.info as { finish?: string }).finish
    if (finish) return true
  }
  return false
}

function sessionIdle(statuses: Record<string, { type?: string }>, sessionID: string): boolean {
  const st = statuses[sessionID]
  return st?.type === 'idle' || st?.type === 'completed' || !st
}

export async function pollUntilTurnEnd(
  sessionID: string,
  directory: string,
  userCountBefore: number,
  options: PollOptions = {},
): Promise<PollResult> {
  const timeoutMs = options.timeoutMs ?? 120_000
  const intervalMs = options.intervalMs ?? 500
  const idleEarlyMs = options.idleEarlyMs ?? 30_000
  const deadline = Date.now() + timeoutMs
  let sawBusy = false
  let idleSince = 0

  while (Date.now() < deadline) {
    if (options.signal?.aborted) {
      const messages = await fetchSessionMessages(sessionID, directory)
      return {
        text: lastAssistantText(messages).trim(),
        reason: 'aborted',
        finished: false,
      }
    }

    const messages = await fetchSessionMessages(sessionID, directory)
    const usersAfter = userMessageCount(messages)
    const text = usersAfter > userCountBefore ? lastAssistantText(messages).trim() : ''
    const hasFinish = usersAfter > userCountBefore && assistantHasFinish(messages, userCountBefore)

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
      if (hasFinish && sessionIdle(statuses, sessionID)) {
        return { text, reason: 'completed', finished: true }
      }
      if (sessionIdle(statuses, sessionID) && sawBusy) {
        idleSince ||= Date.now()
        if (Date.now() - idleSince > idleEarlyMs) {
          return { text, reason: 'idle_early', finished: false }
        }
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  const messages = await fetchSessionMessages(sessionID, directory)
  return {
    text: lastAssistantText(messages).trim(),
    reason: 'timeout',
    finished: false,
  }
}
