import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { resolveSlashMessage } from '@/utils/slashCommands'
import { sendViaMimo } from '@/composables/useMimoChat'

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true
  return e instanceof Error && e.name === 'AbortError'
}

export function useStream() {
  const chat = useChatStore()
  const settings = useSettingsStore()

  async function sendMessage(userContent: string, images: string[] = []) {
    if (chat.streaming || (!userContent.trim() && !images.length)) return

    const content = resolveSlashMessage(userContent, settings.slashCommands)

    if (!chat.activeConversation()) await chat.newConversation()

    chat.error = null

    try {
      await chat.addMessage({
        role: 'user',
        content,
        images: images.length ? images : undefined,
      })
      await chat.addMessage({ role: 'assistant', content: '', model: settings.model })

      chat.streaming = true
      try {
        await sendViaMimo(content)
      } finally {
        chat.streaming = false
        await chat.persist()
      }
    } catch (e) {
      if (isAbortError(e)) return
      const msg = e instanceof Error ? e.message : 'Unknown error'
      chat.error = msg
      const conv = chat.activeConversation()
      const last = conv ? [...conv.messages].reverse().find((m) => m.role === 'assistant') : null
      if (last && !last.content.trim()) {
        last.content = `⚠️ ${msg}`
        await chat.persist()
      } else {
        try {
          await chat.removeLastAssistantIfEmpty()
        } catch {
          // ignore
        }
      }
    }
  }

  return { sendMessage }
}
