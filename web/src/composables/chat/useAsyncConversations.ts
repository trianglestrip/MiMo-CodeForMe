import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ensureChatInit } from '@/stores/chatInit'
import { useChatStore } from '@/stores/chat'

/** 侧栏对话列表：独立异步就绪状态 */
export function useAsyncConversations() {
  const chat = useChatStore()
  const { conversations, activeId, listLoaded } = storeToRefs(chat)
  const ready = ref(false)

  void ensureChatInit().then(() => {
    ready.value = true
  })

  return { ready, conversations, activeId, listLoaded }
}
