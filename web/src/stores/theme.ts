import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const savedTheme = localStorage.getItem('theme') as Theme
  const current = ref<Theme>(savedTheme || 'light')

  function toggle() {
    current.value = current.value === 'light' ? 'dark' : 'light'
  }

  function set(theme: Theme) {
    current.value = theme
  }

  function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }

  // Apply theme immediately on store creation
  applyTheme(current.value)

  // Watch for changes
  watch(current, applyTheme)

  return { current, toggle, set }
})
