<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { mimoConfig } from '@/lib/mimo/config'
import { PRODUCT_NAME, modelDisplayName } from '@/lib/brand'

const settings = useSettingsStore()
const currentModelLabel = computed(() =>
  modelDisplayName(settings.currentModel?.name, settings.model),
)
</script>

<template>
  <ElDrawer v-model="settings.settingsOpen" title="设置" size="460px" destroy-on-close>
    <ElTabs>
      <ElTabPane label="连接" name="server">
        <ElForm label-position="top">
          <ElFormItem label="后端 API">
            <ElInput :model-value="mimoConfig().baseUrl" readonly />
          </ElFormItem>
          <ElText type="info" size="small">
            聊天与 Trace 直连本地 API（mimo serve）。
          </ElText>
        </ElForm>
      </ElTabPane>

      <ElTabPane label="模型" name="model">
        <ElForm label-position="top">
          <ElFormItem label="当前模型">
            <ElInput :model-value="currentModelLabel" readonly />
          </ElFormItem>
          <ElText type="info" size="small">可在顶部栏切换模型。</ElText>
        </ElForm>
      </ElTabPane>

      <ElTabPane label="关于" name="about">
        <ElText tag="p" class="desc">
          {{ PRODUCT_NAME }} 轻量 Web：Vue 聊天 + 调用流程 Trace。工作目录请在顶部栏设置。
        </ElText>
      </ElTabPane>
    </ElTabs>
  </ElDrawer>
</template>

<style scoped>
.desc {
  font-size: 13px;
  color: var(--text-3);
  line-height: 1.6;
}
</style>
