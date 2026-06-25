export type MessageTokenInfo = {
  input?: number
  output?: number
  reasoning?: number
  cacheRead?: number
  cacheWrite?: number
}

export type TokenUsage = {
  total: number
  input: number
  output: number
}

export function usageFromMessageInfo(info: Record<string, unknown> | undefined): TokenUsage | null {
  if (!info) return null
  const raw = info.tokens as Record<string, unknown> | undefined
  if (!raw) return null
  const input = Number(raw.input ?? 0)
  const output = Number(raw.output ?? 0)
  const reasoning = Number(raw.reasoning ?? 0)
  const cache = raw.cache as { read?: number; write?: number } | undefined
  const cacheRead = Number(cache?.read ?? 0)
  const cacheWrite = Number(cache?.write ?? 0)
  const total = input + output + reasoning + cacheRead + cacheWrite
  if (total <= 0) return null
  return { total, input: input + cacheRead + cacheWrite, output: output + reasoning }
}
