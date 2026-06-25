import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/app.css'
import './trace.css'
import TraceApp from './TraceApp.vue'
import { useSettingsStore } from '@/stores/settings'
import { registerClickOutside } from '@/directives/clickOutside'
import { setupElementPlus } from '@/plugins/elementPlus'

;(function () {
  const h = location.hostname
  if (h === 'localhost' || h === '[::1]') {
    location.replace(location.href.replace(h, '127.0.0.1'))
  }
})()

const theme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', theme)
document.documentElement.classList.toggle('dark', theme === 'dark')

const app = createApp(TraceApp)
registerClickOutside(app)
setupElementPlus(app)
app.use(createPinia())
app.mount('#trace-app')
useSettingsStore().initWorkDir()
