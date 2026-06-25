<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { displayWorkDir } from '@/lib/workDir'
import HeaderPopover from '@/components/HeaderPopover.vue'

const settings = useSettingsStore()
const draft = ref(settings.workDir)

watch(
  () => settings.workDir,
  (v) => {
    draft.value = v
  },
)

const label = computed(() => displayWorkDir(settings.workDir))

function apply(close: () => void) {
  settings.setWorkDir(draft.value)
  close()
}

function onKeydown(e: KeyboardEvent, close: () => void) {
  if (e.key === 'Enter') {
    e.preventDefault()
    apply(close)
  }
  if (e.key === 'Escape') close()
}
</script>

<template>
  <HeaderPopover panel-width="min(360px, calc(100vw - 40px))">
    <template #trigger="{ open }">
      <button
        class="selector-trigger"
        :class="{ unset: !settings.workDir }"
        type="button"
        title="工作目录"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span class="path-label">{{ label }}</span>
        <svg class="chevron" :class="{ rotated: open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </template>

    <template #default="{ close }">
      <div class="panel">
        <div class="group-label">工作目录</div>
        <p class="desc">Agent 在此目录读写文件（mimo API 的 directory 参数）</p>
        <input
          v-model="draft"
          class="path-input"
          type="text"
          spellcheck="false"
          placeholder="例如 D:/projects/my-app"
          @keydown="onKeydown($event, close)"
        />
        <button class="apply-btn" type="button" @click="apply(close)">应用</button>
      </div>
    </template>
  </HeaderPopover>
</template>

<style scoped>
.selector-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-3);
  color: var(--text-2);
  font-size: 12px;
  transition: border-color 0.15s, color 0.15s;
}

.selector-trigger:hover {
  border-color: var(--accent);
  color: var(--text);
}

.selector-trigger.unset {
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 40%, var(--border));
}

.path-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, Consolas, monospace;
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.panel {
  padding: 10px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
  margin-bottom: 8px;
}

.path-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  margin-bottom: 8px;
}

.path-input:focus {
  outline: none;
  border-color: var(--accent);
}

.apply-btn {
  width: 100%;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.apply-btn:hover {
  filter: brightness(1.05);
}
</style>
