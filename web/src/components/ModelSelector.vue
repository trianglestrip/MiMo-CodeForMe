<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { ModelInfo } from '@/stores/settings'

const settings = useSettingsStore()
const open = ref(false)

const currentModel = computed(() =>
  settings.models.find(m => m.id === settings.model)
)

const freeModels = computed(() => settings.models.filter(m => m.free))
const paidModels = computed(() => settings.models.filter(m => !m.free))

function select(m: ModelInfo) {
  settings.selectModel(m)
  open.value = false
}
</script>

<template>
  <div class="model-selector" v-click-outside="() => open = false">
    <button class="selector-trigger" @click="open = !open">
      <span v-if="currentModel?.free" class="free-dot" title="免费通道"></span>
      <span class="model-name">{{ currentModel?.name ?? settings.model }}</span>
      <svg class="chevron" :class="{ rotated: open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <div v-if="open" class="dropdown">
      <!-- Free models -->
      <div class="group-label">免费通道</div>
      <button
        v-for="m in freeModels"
        :key="m.id"
        class="model-option"
        :class="{ active: settings.model === m.id }"
        @click="select(m)"
      >
        <span class="free-dot"></span>
        <div class="option-info">
          <span class="option-name">{{ m.name }}</span>
          <span class="option-desc">{{ m.description }}</span>
        </div>
        <svg v-if="settings.model === m.id" class="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>

      <div class="divider"></div>

      <!-- Paid models -->
      <div class="group-label">官方通道（需 API Key）</div>
      <button
        v-for="m in paidModels"
        :key="m.id"
        class="model-option"
        :class="{ active: settings.model === m.id }"
        @click="select(m)"
      >
        <span class="paid-dot"></span>
        <div class="option-info">
          <span class="option-name">{{ m.name }}</span>
          <span class="option-desc">{{ m.description }}</span>
        </div>
        <svg v-if="settings.model === m.id" class="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<!-- click-outside directive -->
<script lang="ts">
import type { Directive } from 'vue'
const vClickOutside: Directive = {
  mounted(el, binding) {
    el._clickOutside = (e: Event) => {
      if (!el.contains(e.target as Node)) binding.value(e)
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  },
}
export default { directives: { 'click-outside': vClickOutside } }
</script>

<style scoped>
.model-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-3);
  color: var(--text-2);
  font-size: 13px;
  transition: all 0.15s;
}
.selector-trigger:hover {
  border-color: var(--accent);
  color: var(--text);
}

.model-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
}
.chevron.rotated {
  transform: rotate(180deg);
}

.free-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--free-color);
  flex-shrink: 0;
}

.paid-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 280px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 100;
  overflow: hidden;
  padding: 6px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 8px 4px;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background 0.15s;
}
.model-option:hover {
  background: var(--bg-3);
}
.model-option.active {
  background: var(--accent-dim);
}

.option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.option-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.option-desc {
  font-size: 11px;
  color: var(--text-3);
}

.check {
  color: var(--accent);
  flex-shrink: 0;
}
</style>
