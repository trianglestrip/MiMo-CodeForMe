import { createTurnEngine } from '@/composables/turn/useTurnEngine'
import type { MessageAttachment } from '@/lib/composer/attachments'
import { useSettingsStore } from '@/stores/settings'
import { resolveSlashMessage } from '@/utils/slashCommands'
import { useChatStore } from '@/stores/chat'

export function useStream() {
  const chat = useChatStore()
  const settings = useSettingsStore()
  const engine = createTurnEngine()

  async function sendMessage(userContent: string, attachments: MessageAttachment[] = []) {
    if (!userContent.trim() && !attachments.length) return
    if (!chat.activeConversation()) await chat.newConversation()
    chat.error = null
    const content = resolveSlashMessage(userContent, settings.slashCommands)
    engine.send(content, attachments)
  }

  return {
    sendMessage,
    stopGeneration: engine.stopCurrent,
    forceSendMessage: engine.forceSend,
    engine,
  }
}
