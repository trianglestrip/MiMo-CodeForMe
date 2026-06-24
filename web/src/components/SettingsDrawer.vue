<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { mimoConfig } from '@/lib/mimo/config'

const settings = useSettingsStore()

onMounted(async () => {
  await settings.fetchWorkspace()
})

function close() {
  settings.settingsOpen = false
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="drawer">
      <div class="drawer-header">
        <h3>设置</h3>
        <button class="close-btn" @click="close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="drawer-body">
        <section class="section">
          <label class="label">MiMo Serve</label>
          <p class="desc">聊天与 Trace 直连 mimo serve，无需 BcAI API。</p>
          <p class="hint-text">{{ mimoConfig().baseUrl }}</p>
        </section>

        <section class="section">
          <label class="label">工作目录</label>
          <p class="desc">Agent 在此目录内读写文件、执行命令。</p>
          <p class="hint-text">{{ settings.workspacePath || '（未配置 VITE_MIMO_WORK_DIR）' }}</p>
        </section>

        <section class="section">
          <label class="label">关于</label>
          <p class="desc">MiMoCode 轻量 Web：Vue 聊天 + 调用流程 Trace。</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 460px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.drawer-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  color: var(--text-3);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover {
  background: var(--bg-3);
  color: var(--text);
}

.drawer-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.desc {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.6;
}

.hint-text {
  font-size: 12px;
  color: var(--text-3);
  word-break: break-all;
  font-family: ui-monospace, Consolas, monospace;
}
</style>
