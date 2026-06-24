import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const username = ref('user')
  const displayName = ref('MiMoCode')
  const authenticated = ref(true)
  const loaded = ref(false)

  async function init() {
    loaded.value = true
  }

  return { username, displayName, authenticated, loaded, init }
})
