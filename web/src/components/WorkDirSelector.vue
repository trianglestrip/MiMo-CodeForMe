<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowDown, Folder } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { displayWorkDir } from '@/lib/workDir'

const settings = useSettingsStore()
const visible = ref(false)
const draft = ref(settings.workDir)

watch(
  () => settings.workDir,
  (v) => {
    draft.value = v
  },
)

watch(visible, (open) => {
  if (open) draft.value = settings.workDir
})

const label = computed(() => displayWorkDir(settings.workDir))

function apply() {
  settings.setWorkDir(draft.value)
  visible.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    apply()
  }
  if (e.key === 'Escape') visible.value = false
}
</script>

<template>
  <ElPopover v-model:visible="visible" :width="360" trigger="click" placement="bottom-end" :show-arrow="false">
    <template #reference>
      <ElButton
        class="trigger"
        :type="settings.workDir ? 'default' : 'danger'"
        title="工作目录"
      >
        <ElIcon><Folder /></ElIcon>
        <span class="path-label">{{ label }}</span>
        <ElIcon><ArrowDown /></ElIcon>
      </ElButton>
    </template>

    <ElForm label-position="top" @submit.prevent="apply">
      <ElFormItem label="工作目录">
        <ElText type="info" size="small" class="desc">
          Agent 在此目录读写文件（后端 API 的 directory 参数）
        </ElText>
        <ElInput
          v-model="draft"
          spellcheck="false"
          placeholder="例如 D:/projects/my-app"
          clearable
          @keydown="onKeydown"
        />
      </ElFormItem>
      <ElButton type="primary" native-type="submit" class="apply-btn">应用</ElButton>
    </ElForm>
  </ElPopover>
</template>

<style scoped>
.trigger {
  max-width: 220px;
}

.path-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
}

.desc {
  display: block;
  line-height: 1.5;
  margin-bottom: 8px;
}

.apply-btn {
  width: 100%;
}
</style>
