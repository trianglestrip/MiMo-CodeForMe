import { readJsonAsync } from '@/lib/asyncLocalStorage'
import type { Conversation } from '@/stores/chat'

export const CHAT_STORAGE_KEY = 'mimo-web-conversations'

let initTask: Promise<void> | null = null

/** 独立于 store 实例的初始化入口，避免 HMR/旧 bundle 下 store 方法缺失 */
export function ensureChatInit(): Promise<void> {
  if (!initTask) {
    initTask = import('./chat')
      .then(async ({ useChatStore }) => {
        const store = useChatStore()
        if (store.listLoaded) return

        try {
          const data = await readJsonAsync<Conversation[]>(CHAT_STORAGE_KEY)
          store.$patch({
            conversations: data ?? [],
            activeId: data?.[0]?.id ?? null,
            listLoaded: true,
          })
          if (!store.conversations.length) await store.newConversation()
        } catch (e) {
          store.$patch({
            error: e instanceof Error ? e.message : 'Failed to load conversations',
            listLoaded: true,
          })
        }
      })
      .catch((e) => {
        initTask = null
        throw e
      })
  }
  return initTask
}
