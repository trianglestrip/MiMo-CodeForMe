import { storeToRefs } from 'pinia'
import { useTurnQueueStore } from '@/stores/turnQueue'

export function useMessageQueue() {
  const store = useTurnQueueStore()
  const { items } = storeToRefs(store)

  return {
    items,
    enqueue: store.enqueue,
    enqueueFront: store.enqueueFront,
    dequeue: store.dequeue,
    update: store.update,
    remove: store.remove,
    promoteToFront: store.promoteToFront,
    clear: store.clear,
  }
}
