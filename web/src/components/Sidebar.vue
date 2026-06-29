<script setup lang="ts">
import { Plus, ChatDotRound, Close, Moon, Sunny, Setting } from '@element-plus/icons-vue'
import { PRODUCT_NAME } from '@/lib/brand'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import ConvListSkeleton from '@/components/skeleton/ConvListSkeleton.vue'
import { useAsyncConversations } from '@/composables/chat/useAsyncConversations'

const chat = useChatStore()
const { ready: convListReady, conversations } = useAsyncConversations()
const settings = useSettingsStore()
const theme = useThemeStore()
const user = useUserStore()

function onSelect(id: string) {
  chat.selectConversation(id)
}
</script>

<template>
  <ElContainer direction="vertical" class="sidebar">
    <ElHeader class="shell-header sidebar-header">
      <div class="logo">
        <img class="logo-icon" src="/favicon.svg" :alt="PRODUCT_NAME" />
        <span class="logo-text">{{ PRODUCT_NAME }}</span>
      </div>
      <ElButton :icon="Plus" circle size="small" title="新对话" @click="chat.newConversation()" />
    </ElHeader>

    <ElMain class="shell-main conv-main">
      <ConvListSkeleton v-if="!convListReady" />
      <ElScrollbar v-else class="conv-list">
        <ElMenu
          :key="chat.activeId ?? ''"
          :default-active="chat.activeId ?? ''"
          class="conv-menu"
          @select="onSelect"
        >
          <ElMenuItem v-for="conv in conversations" :key="conv.id" :index="conv.id">
            <ElIcon><ChatDotRound /></ElIcon>
            <span class="conv-title">{{ conv.title }}</span>
            <ElButton
              :icon="Close"
              circle
              size="small"
              text
              class="del-btn"
              title="删除"
              @click.stop="chat.deleteConversation(conv.id)"
            />
          </ElMenuItem>
        </ElMenu>
      </ElScrollbar>
    </ElMain>

    <ElFooter class="shell-footer sidebar-footer">
      <ElText tag="p" class="user-greeting">你好！{{ user.displayName }}</ElText>
      <div class="footer-actions">
        <ElButton
          class="footer-btn"
          :icon="theme.current === 'light' ? Moon : Sunny"
          :title="theme.current === 'light' ? '切换到深色模式' : '切换到浅色模式'"
          @click="theme.toggle()"
        >
          {{ theme.current === 'light' ? '深色' : '浅色' }}
        </ElButton>
        <ElButton class="footer-btn" :icon="Setting" @click="settings.settingsOpen = true">
          设置
        </ElButton>
      </div>
    </ElFooter>
  </ElContainer>
</template>

<style scoped>
.sidebar {
  height: 100%;
  background: var(--bg-2);
  border-right: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.logo-text {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
}

.conv-main {
  flex: 1;
}

.conv-list {
  height: 100%;
  padding: 4px;
}

.conv-menu {
  border-right: none;
  background: transparent;
}

.conv-menu :deep(.el-menu-item) {
  height: auto;
  min-height: 36px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  gap: 8px;
}

.conv-menu :deep(.el-menu-item.is-active) {
  background: var(--accent-dim);
}

.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.del-btn {
  opacity: 0;
  margin-left: auto;
}

.conv-menu :deep(.el-menu-item:hover) .del-btn {
  opacity: 1;
}

.sidebar-footer {
  padding: 16px 12px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-3);
}

.user-greeting {
  padding: 0 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.footer-actions :deep(.footer-btn) {
  flex: 1;
  margin: 0;
  height: 42px;
  font-size: 13px;
  font-weight: 500;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  border: 1px solid var(--border);
  color: var(--text);
}

.footer-actions :deep(.footer-btn:hover) {
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  color: var(--accent);
}
</style>
