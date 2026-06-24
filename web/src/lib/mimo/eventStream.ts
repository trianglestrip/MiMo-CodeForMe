import { authHeader } from './config'
import { eventUrl } from './client'

export type MimoBusEvent = {
  type?: string
  properties?: Record<string, unknown>
}

function parseSseBlocks(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n')
  return { events: parts.slice(0, -1).filter((p) => p.trim()), rest: parts[parts.length - 1] ?? '' }
}

function dataFromBlock(block: string): string | null {
  const lines = block.split('\n')
  const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart())
  return dataLines.length ? dataLines.join('\n') : null
}

export async function subscribeMimoEvents(
  directory: string,
  onEvent: (ev: MimoBusEvent) => void,
  signal?: AbortSignal,
  onOpen?: () => void,
): Promise<void> {
  const res = await fetch(eventUrl(directory), {
    headers: {
      Authorization: authHeader(),
      Accept: 'text/event-stream',
    },
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`event stream failed (${res.status})`)
  }

  onOpen?.()

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBlocks(buffer)
    buffer = parsed.rest
    for (const block of parsed.events) {
      const data = dataFromBlock(block)
      if (!data) continue
      try {
        onEvent(JSON.parse(data) as MimoBusEvent)
      } catch {
        // skip
      }
    }
  }
}
