<script setup lang="ts">
import '@/app.css'
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import Sidebar from '@/components/Sidebar.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import { startMimoTraceBackground } from '@/composables/useMimoChat'

const settings = useSettingsStore()
const theme = useThemeStore()
const user = useUserStore()
const chat = useChatStore()

onMounted(async () => {
  settings.initWorkDir()
  startMimoTraceBackground()
  await Promise.all([
    settings.fetchModels(),
    user.init(),
    chat.init(),
  ])
  document.documentElement.setAttribute('data-theme', theme.current)
})
</script>

<template>
  <div class="app-layout">
    <Sidebar />
    <ChatWindow />
    <SettingsDrawer v-if="settings.settingsOpen" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}
</style>
