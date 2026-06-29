import { MessageID, SessionID } from "./schema"

export type DebugCaptureSnapshot = {
  system: string[]
  tools: string[]
  additions: string[]
  instructionPaths: string[]
  messageCount: number
  capturedAt: number
}

type SessionEntry = {
  order: string[]
  byMessage: Map<string, DebugCaptureSnapshot>
}

const MAX_SESSIONS = 50
const MAX_MESSAGES_PER_SESSION = 10

const sessions = new Map<string, SessionEntry>()
const sessionOrder: string[] = []

function touchSession(sessionID: string) {
  const idx = sessionOrder.indexOf(sessionID)
  if (idx >= 0) sessionOrder.splice(idx, 1)
  sessionOrder.push(sessionID)
  while (sessionOrder.length > MAX_SESSIONS) {
    const evict = sessionOrder.shift()
    if (evict) sessions.delete(evict)
  }
}

function trimMessages(entry: SessionEntry) {
  while (entry.order.length > MAX_MESSAGES_PER_SESSION) {
    const evict = entry.order.shift()
    if (evict) entry.byMessage.delete(evict)
  }
}

export function capture(
  sessionID: SessionID,
  userMessageID: MessageID,
  payload: Omit<DebugCaptureSnapshot, "capturedAt">,
) {
  const key = sessionID as string
  const messageKey = userMessageID as string
  let entry = sessions.get(key)
  if (!entry) {
    entry = { order: [], byMessage: new Map() }
    sessions.set(key, entry)
  }
  touchSession(key)
  const snapshot: DebugCaptureSnapshot = { ...payload, capturedAt: Date.now() }
  if (!entry.byMessage.has(messageKey)) entry.order.push(messageKey)
  entry.byMessage.set(messageKey, snapshot)
  trimMessages(entry)
}

export function get(sessionID: SessionID, userMessageID?: MessageID): DebugCaptureSnapshot | undefined {
  const entry = sessions.get(sessionID as string)
  if (!entry) return undefined
  if (userMessageID) return entry.byMessage.get(userMessageID as string)
  const last = entry.order[entry.order.length - 1]
  return last ? entry.byMessage.get(last) : undefined
}

export function clearForTests() {
  sessions.clear()
  sessionOrder.length = 0
}

export * as DebugCapture from "./debug-capture"
