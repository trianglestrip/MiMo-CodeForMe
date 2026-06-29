import { readJsonAsync, scheduleWriteJson } from '@/lib/asyncLocalStorage'

export const SESSION_MAP_KEY = 'mimo-web-session-map'
export const SESSION_MAP_CHANGED = 'mimo-session-map-changed'

export type SessionMapEntry = {
  sessionId: string
  title: string
  updatedAt: number
  createdAt?: number
}

export type SessionMap = Record<string, SessionMapEntry>

export function latestSessionIdFromMap(
  map: Record<string, { sessionId?: string; updatedAt?: number; createdAt?: number }>,
): string | null {
  const entries = Object.values(map).filter((e) => e?.sessionId)
  entries.sort(
    (a, b) => (b.createdAt ?? b.updatedAt ?? 0) - (a.createdAt ?? a.updatedAt ?? 0),
  )
  return entries[0]?.sessionId ?? null
}

export async function loadSessionMapAsync(): Promise<SessionMap> {
  return (await readJsonAsync<SessionMap>(SESSION_MAP_KEY)) ?? {}
}

export async function persistSessionLinkAsync(
  conversationId: string,
  sessionId: string,
  title: string,
): Promise<void> {
  const map = await loadSessionMapAsync()
  const prev = map[conversationId]
  map[conversationId] = {
    sessionId,
    title,
    updatedAt: Date.now(),
    createdAt: prev?.createdAt ?? Date.now(),
  }
  await scheduleWriteJson(SESSION_MAP_KEY, map)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_MAP_CHANGED))
  }
}
