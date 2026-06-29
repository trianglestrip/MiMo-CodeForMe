import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MessageAttachment } from '@/lib/composer/attachments'

export interface QueuedMessage {
  id: string
  content: string
  attachments: MessageAttachment[]
  createdAt: number
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useTurnQueueStore = defineStore('turnQueue', () => {
  const items = ref<QueuedMessage[]>([])

  function enqueue(content: string, attachments: MessageAttachment[] = []) {
    items.value.push({ id: genId(), content, attachments, createdAt: Date.now() })
  }

  function enqueueFront(content: string, attachments: MessageAttachment[] = []) {
    items.value.unshift({ id: genId(), content, attachments, createdAt: Date.now() })
  }

  function dequeue(): QueuedMessage | null {
    return items.value.shift() ?? null
  }

  function update(id: string, content: string) {
    const item = items.value.find((x) => x.id === id)
    if (item) item.content = content
  }

  function remove(id: string) {
    items.value = items.value.filter((x) => x.id !== id)
  }

  function promoteToFront(id: string) {
    const idx = items.value.findIndex((x) => x.id === id)
    if (idx <= 0) return
    const [item] = items.value.splice(idx, 1)
    items.value.unshift(item)
  }

  function clear() {
    items.value = []
  }

  return { items, enqueue, enqueueFront, dequeue, update, remove, promoteToFront, clear }
})
