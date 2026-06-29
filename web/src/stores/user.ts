import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PRODUCT_NAME } from '@/lib/brand'

export const useUserStore = defineStore('user', () => {
  const username = ref('user')
  const displayName = ref(PRODUCT_NAME)
  const authenticated = ref(true)
  const loaded = ref(false)

  async function init() {
    loaded.value = true
  }

  return { username, displayName, authenticated, loaded, init }
})
