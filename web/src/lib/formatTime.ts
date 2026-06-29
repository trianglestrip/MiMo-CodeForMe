const BEIJING = 'Asia/Shanghai'

export function fmtBeijingTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    timeZone: BEIJING,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function fmtBeijingDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    timeZone: BEIJING,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** 北京时间，精确到分钟（无秒） */
export function fmtBeijingMinute(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    timeZone: BEIJING,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDateRange(start: number, end: number): string {
  const a = fmtBeijingDate(start)
  const b = fmtBeijingDate(end)
  return a === b ? a : `${a} – ${b}`
}

/** 起止时间（精确到分钟） */
export function fmtDateTimeRange(start: number, end: number): string {
  const a = fmtBeijingMinute(start)
  const b = fmtBeijingMinute(end)
  if (a === b) return a
  const sameDay = fmtBeijingDate(start) === fmtBeijingDate(end)
  if (sameDay) {
    const timeOnly = (s: string) => s.split(' ').pop() ?? s
    return `${fmtBeijingDate(start)} ${timeOnly(a)} – ${timeOnly(b)}`
  }
  return `${a} – ${b}`
}

export function fmtDuration(ms?: number): string {
  if (ms == null || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(1)}s`
  const min = Math.floor(sec / 60)
  return `${min}m ${Math.round(sec % 60)}s`
}

export function fmtTokenCount(n?: number): string {
  if (n == null || n <= 0) return '—'
  return n.toLocaleString('zh-CN')
}
