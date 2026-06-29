import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { yieldToMain } from '@/lib/asyncLocalStorage'
import { ensureChatInit } from '@/stores/chatInit'
import { useChatStore } from '@/stores/chat'

/** 消息区：切换对话时独立异步就绪，不阻塞侧栏/输入框 */
export function useAsyncMessageList() {
  const chat = useChatStore()
  const { activeId, streaming } = storeToRefs(chat)
  const ready = ref(false)

  const messages = computed(() => chat.activeConversation()?.messages ?? [])

  watch(
    activeId,
    async () => {
      ready.value = false
      await ensureChatInit()
      await yieldToMain()
      ready.value = true
    },
    { immediate: true },
  )

  return { ready, messages, streaming, activeId }
}
