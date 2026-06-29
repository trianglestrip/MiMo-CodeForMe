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

const TURN_ACCENT_PALETTE = [
  '#7c00ff',
  '#ff6d00',
  '#00c853',
  '#2979ff',
  '#00b0ff',
  '#536dfe',
  '#d500f9',
  '#e91e63',
  '#00bcd4',
  '#8bc34a',
  '#ff5722',
  '#673ab7',
]

export function turnAccentColor(turnId: string): string {
  let hash = 0
  for (let i = 0; i < turnId.length; i++) hash = (hash * 31 + turnId.charCodeAt(i)) | 0
  return TURN_ACCENT_PALETTE[Math.abs(hash) % TURN_ACCENT_PALETTE.length]
}

export function turnAccentStyle(turnId: string): Record<string, string> {
  const accent = turnAccentColor(turnId)
  return {
    '--turn-accent': accent,
    '--turn-accent-border': accent,
  }
}
