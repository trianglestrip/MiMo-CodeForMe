import type { InjectionKey } from 'vue'
import { ref } from 'vue'
import type { PollEndReason } from '@/lib/mimo/poll'
import type { StopReason } from '@/stores/chat'
import { abortSession } from '@/lib/mimo/sessionControl'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { resolveSlashMessage } from '@/utils/slashCommands'
import {
  ensureSession,
  runTurn,
  workDirForTurn,
  persistSessionLinkForConv,
} from '@/composables/useMimoChat'
import { useMessageQueue } from '@/composables/turn/useMessageQueue'
import { defaultPromptForAttachments } from '@/lib/composer/attachments'
import type { MessageAttachment } from '@/lib/composer/attachments'
import { usageFromMessageInfo } from '@/lib/mimo/tokens'
import { fetchSessionMessages, userMessageCount } from '@/lib/mimo/client'

export type TurnEngine = ReturnType<typeof createTurnEngine>

export const TURN_ENGINE_KEY: InjectionKey<TurnEngine> = Symbol('turnEngine')

function pollReasonToStop(reason: PollEndReason): StopReason | undefined {
  if (reason === 'completed') return undefined
  if (reason === 'aborted') return 'aborted'
  if (reason === 'idle_early') return 'idle_early'
  if (reason === 'timeout') return 'timeout'
  return 'error'
}

function normalizeContent(text: string, attachments: MessageAttachment[]) {
  if (text.trim()) return text.trim()
  if (attachments.length) return defaultPromptForAttachments(attachments)
  return ''
}

export function createTurnEngine() {
  const chat = useChatStore()
  const settings = useSettingsStore()
  const queue = useMessageQueue()
  const turnState = ref<'idle' | 'running'>('idle')
  let pipelineTail: Promise<void> = Promise.resolve()
  let pipelineScheduled = false
  let activeAbort: AbortController | null = null
  let currentSessionID: string | null = null

  async function dispatchTurn(content: string, attachments: MessageAttachment[]) {
    if (!chat.activeConversation()) await chat.newConversation()
    chat.error = null

    await chat.addMessage({
      role: 'user',
      content,
      attachments: attachments.length ? attachments : undefined,
    })
    await chat.addMessage({ role: 'assistant', content: '', model: settings.model })

    chat.pushAssistantActivity({ key: 'wait', phase: 'think', label: '等待 MiMo 响应…', status: 'running' })

    const conv = chat.activeConversation()
    if (!conv) return

    const sessionID = await ensureSession(conv.id)
    currentSessionID = sessionID
    const directory = workDirForTurn()
    const before = await fetchSessionMessages(sessionID, directory)
    const usersBefore = userMessageCount(before)

    activeAbort = new AbortController()
    chat.streaming = true

    try {
      const result = await runTurn(sessionID, content, usersBefore, activeAbort.signal, attachments)
      const after = await fetchSessionMessages(sessionID, directory)
      let usage = null as ReturnType<typeof usageFromMessageInfo>
      for (let i = after.length - 1; i >= 0; i--) {
        const msg = after[i]
        if (msg.info?.role !== 'assistant') continue
        usage = usageFromMessageInfo(msg.info as Record<string, unknown>)
        if (usage) break
      }
      if (result.text) chat.setLastAssistantContent(result.text)

      const last = chat.lastAssistant()
      const hasContent = Boolean(
        last?.content.trim() || last?.reasoning?.trim() || last?.activities?.length,
      )

      if (!hasContent && result.reason !== 'aborted') {
        throw new Error('未收到 MiMo 回复，请新建对话后重试')
      }

      const stopReason = pollReasonToStop(result.reason)
      chat.completeLastAssistant({
        usage: usage ?? undefined,
        stopReason,
        incomplete: !result.finished,
      })
      persistSessionLinkForConv(conv.id, sessionID, conv.title)
    } catch (e) {
      if (activeAbort?.signal.aborted) {
        chat.completeLastAssistant({ stopReason: 'aborted', incomplete: true })
        return
      }
      const msg = e instanceof Error ? e.message : 'Unknown error'
      chat.error = msg
      const last = chat.lastAssistant()
      if (last && !last.content.trim()) {
        last.content = `⚠️ ${msg}`
        last.incomplete = true
        last.stopReason = 'error'
        last.completedAt = Date.now()
        last.durationMs = Date.now() - last.createdAt
      } else {
        await chat.removeLastAssistantIfEmpty()
      }
    } finally {
      chat.finishAssistantActivities()
      chat.streaming = false
      currentSessionID = null
      activeAbort = null
    }
  }

  async function runOneTurn(content: string, attachments: MessageAttachment[]) {
    turnState.value = 'running'
    try {
      const resolved = resolveSlashMessage(content, settings.slashCommands)
      await dispatchTurn(resolved, attachments)
    } finally {
      turnState.value = 'idle'
    }
  }

  /** 串行执行：一次只跑一轮，结束后自动 drain 队列 */
  function schedulePipeline(initial?: { content: string; attachments: MessageAttachment[] }) {
    pipelineScheduled = true
    pipelineTail = pipelineTail.then(async () => {
      try {
        if (initial) await runOneTurn(initial.content, initial.attachments)
        while (queue.items.value.length) {
          const item = queue.dequeue()
          if (!item) break
          await runOneTurn(item.content, item.attachments)
        }
      } finally {
        pipelineScheduled = false
      }
    })
    return pipelineTail
  }

  async function waitUntilIdle() {
    await pipelineTail
    const deadline = Date.now() + 8000
    while (turnState.value === 'running' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    await pipelineTail
  }

  function isBusy() {
    return turnState.value === 'running' || pipelineScheduled
  }

  /** Cursor：空闲直发，忙碌则入队 */
  function send(text: string, attachments: MessageAttachment[] = []) {
    const content = normalizeContent(text, attachments)
    if (!content && !attachments.length) return
    if (isBusy() || queue.items.value.length) {
      queue.enqueue(content, attachments)
      if (!isBusy()) schedulePipeline()
      return
    }
    schedulePipeline({ content, attachments })
  }

  async function stopCurrent() {
    if (turnState.value !== 'running') return
    activeAbort?.abort()
    if (currentSessionID) {
      try {
        await abortSession(currentSessionID, workDirForTurn())
      } catch {
        // ignore
      }
    }
  }

  /** Cursor：Ctrl+Enter — 停止当前并立即发送（插到队首） */
  async function forceSend(text: string, attachments: MessageAttachment[] = []) {
    const content = normalizeContent(text, attachments)
    if (!content && !attachments.length) return
    if (turnState.value === 'running') {
      await stopCurrent()
      await waitUntilIdle()
    }
    queue.enqueueFront(content, attachments)
    if (!isBusy()) schedulePipeline()
  }

  /** Cursor：排队条 ⬆️ — 停止当前并执行该条 */
  async function runQueuedNow(id: string) {
    if (!queue.items.value.some((x) => x.id === id)) return
    queue.promoteToFront(id)
    if (turnState.value === 'running') {
      await stopCurrent()
      await waitUntilIdle()
    }
    if (!isBusy()) schedulePipeline()
  }

  return {
    turnState,
    queue: queue.items,
    send,
    stopCurrent,
    forceSend,
    runQueuedNow,
    updateQueued: queue.update,
    removeQueued: queue.remove,
  }
}
