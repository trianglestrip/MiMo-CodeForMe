import type { PollResult } from '@/lib/mimo/poll'
import { pollUntilTurnEnd } from '@/lib/mimo/poll'
import { fetchSessionMessages, lastAssistantText } from '@/lib/mimo/client'
import { onTurnFinish } from '@/composables/useMimoChat'

export async function waitTurnEnd(
  sessionID: string,
  directory: string,
  userCountBefore: number,
  signal?: AbortSignal,
): Promise<PollResult> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (result: PollResult) => {
      if (settled) return
      settled = true
      offFinish()
      signal?.removeEventListener('abort', onAbort)
      resolve(result)
    }

    const offFinish = onTurnFinish(async (sid, info) => {
      if (sid !== sessionID || settled) return
      if (!info.finish) return
      const messages = await fetchSessionMessages(sessionID, directory)
      finish({
        text: lastAssistantText(messages).trim(),
        reason: 'completed',
        finished: true,
      })
    })

    const onAbort = () => {
      void fetchSessionMessages(sessionID, directory).then((messages) => {
        finish({
          text: lastAssistantText(messages).trim(),
          reason: 'aborted',
          finished: false,
        })
      })
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    void pollUntilTurnEnd(sessionID, directory, userCountBefore, { signal }).then(finish)
  })
}
