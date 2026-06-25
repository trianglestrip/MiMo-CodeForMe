<script setup lang="ts">
import '@/app.css'
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import Sidebar from '@/components/Sidebar.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import { startMimoTraceBackground } from '@/composables/useMimoChat'
import { ensureChatInit } from '@/stores/chatInit'

const settings = useSettingsStore()
const user = useUserStore()

settings.initWorkDir()
startMimoTraceBackground()
void ensureChatInit()

onMounted(() => {
  void settings.fetchModels()
  void user.init()
})
</script>

<template>
  <ElContainer class="app-layout">
    <ElAside width="240px" class="shell-aside">
      <Sidebar />
    </ElAside>
    <ElContainer direction="vertical" class="shell-vertical">
      <ChatWindow />
    </ElContainer>
    <SettingsDrawer />
  </ElContainer>
</template>
