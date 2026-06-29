import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/app.css'
import './trace.css'
import TraceApp from './TraceApp.vue'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { registerClickOutside } from '@/directives/clickOutside'
import { setupElementPlus } from '@/plugins/elementPlus'

;(function () {
  const h = location.hostname
  if (h === 'localhost' || h === '[::1]') {
    location.replace(location.href.replace(h, '127.0.0.1'))
  }
})()

const app = createApp(TraceApp)
const pinia = createPinia()

registerClickOutside(app)
setupElementPlus(app)
app.use(pinia)
useThemeStore()
useSettingsStore().initWorkDir()
app.mount('#trace-app')
