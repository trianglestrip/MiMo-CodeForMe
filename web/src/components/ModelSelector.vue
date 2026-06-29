<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Check } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const currentModel = computed(() =>
  settings.models.find(m => m.id === settings.model),
)

const freeModels = computed(() => settings.models.filter(m => m.free))
const paidModels = computed(() => settings.models.filter(m => !m.free))

function select(id: string) {
  const m = settings.models.find(x => x.id === id)
  if (m) settings.selectModel(m)
}
</script>

<template>
  <ElDropdown trigger="click" placement="bottom-end" @command="select">
    <ElButton class="trigger">
      <span class="trigger-inner">
        <span
          v-if="currentModel?.free"
          class="model-dot model-dot-free"
          title="免费通道"
          aria-hidden="true"
        />
        <span
          v-else-if="currentModel"
          class="model-dot model-dot-paid"
          title="官方通道"
          aria-hidden="true"
        />
        <span class="model-name">{{ currentModel?.name ?? settings.model }}</span>
        <ElIcon class="trigger-arrow"><ArrowDown /></ElIcon>
      </span>
    </ElButton>

    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem disabled class="group-label">免费通道</ElDropdownItem>
        <ElDropdownItem
          v-for="m in freeModels"
          :key="m.id"
          :command="m.id"
          :class="{ active: settings.model === m.id }"
        >
          <span class="model-dot model-dot-free" aria-hidden="true" />
          <span class="option-name">{{ m.name }}</span>
          <span class="option-desc">{{ m.description }}</span>
          <ElIcon v-if="settings.model === m.id" class="check"><Check /></ElIcon>
        </ElDropdownItem>

        <ElDropdownItem divided disabled class="group-label">官方通道（需 API Key）</ElDropdownItem>
        <ElDropdownItem
          v-for="m in paidModels"
          :key="m.id"
          :command="m.id"
          :class="{ active: settings.model === m.id }"
        >
          <span class="model-dot model-dot-paid" aria-hidden="true" />
          <span class="option-name">{{ m.name }}</span>
          <span class="option-desc">{{ m.description }}</span>
          <ElIcon v-if="settings.model === m.id" class="check"><Check /></ElIcon>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style scoped>
.trigger {
  max-width: 240px;
  height: 32px;
  padding: 0 12px;
}

.trigger :deep(> span) {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.trigger-inner {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  max-width: 100%;
  line-height: 1;
}

.model-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.model-dot-free {
  background: var(--free-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--free-color) 25%, transparent);
}

.model-dot-paid {
  background: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent);
}

.model-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.2;
}

.trigger-arrow {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 260px;
}

:deep(.el-dropdown-menu__item.active) {
  background: var(--accent-dim);
}

.option-name {
  font-weight: 500;
  flex-shrink: 0;
}

.option-desc {
  flex: 1;
  font-size: 11px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check {
  color: var(--accent);
  margin-left: auto;
}
</style>
