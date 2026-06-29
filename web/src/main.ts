import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useThemeStore } from './stores/theme'
import { registerClickOutside } from './directives/clickOutside'
import { setupElementPlus } from './plugins/elementPlus'

const pinia = createPinia()
const app = createApp(App)

registerClickOutside(app)
setupElementPlus(app)
app.use(pinia)

// Initialize theme BEFORE mounting the app
const themeStore = useThemeStore()
console.log('Theme initialized:', themeStore.current)

app.mount('#app')
