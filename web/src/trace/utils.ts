import { fmtBeijingTime, fmtDateTimeRange } from '@/lib/formatTime'

export function preview(text: string, max = 160): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export function fmtTime(ts: number): string {
  return fmtBeijingTime(ts)
}

export function formatSessionDateRange(createdAt: number, updatedAt: number): string {
  return fmtDateTimeRange(createdAt, updatedAt)
}

export function normPath(p: unknown): string {
  return String(p || '').replace(/\\/g, '/')
}

export function sessionPageUrl(sessionID: string): string {
  return `/trace.html?session=${encodeURIComponent(sessionID)}`
}

export function shortSessionId(id: string): string {
  return id.length > 12 ? id.slice(-8) : id
}
