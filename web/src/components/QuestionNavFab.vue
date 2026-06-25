<script setup lang="ts">
import { ref } from 'vue'

export interface QuestionNavItem {
  id: string
  label: string
}

const props = withDefaults(
  defineProps<{
    items: QuestionNavItem[]
    scrollRoot?: HTMLElement | null
    offsetBottom?: number
  }>(),
  { offsetBottom: 24 },
)

const open = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function onEnter() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  open.value = true
}

function onLeave() {
  closeTimer = setTimeout(() => {
    open.value = false
  }, 180)
}

function jumpTo(id: string) {
  const root = props.scrollRoot
  if (!root) return
  const el = root.querySelector(`[data-qnav="${CSS.escape(id)}"]`)
  if (!(el instanceof HTMLElement)) return
  const top = root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 12
  root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  el.classList.add('qnav-flash')
  window.setTimeout(() => el.classList.remove('qnav-flash'), 1200)
  open.value = false
}
</script>

<template>
  <div
    v-if="items.length"
    class="qnav-wrap"
    :style="{ bottom: `${offsetBottom}px` }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <div v-if="open" class="qnav-panel">
      <div class="qnav-head">问题列表 · {{ items.length }}</div>
      <ul class="qnav-list">
        <li v-for="(item, index) in items" :key="item.id">
          <button type="button" class="qnav-item" @click="jumpTo(item.id)">
            <span class="qnav-num">{{ index + 1 }}</span>
            <span class="qnav-label">{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </div>

    <button type="button" class="qnav-fab" title="问题列表" aria-label="问题列表">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.qnav-wrap {
  position: fixed;
  right: 24px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.qnav-fab {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 45%, transparent);
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}

.qnav-fab:hover {
  transform: scale(1.05);
  background: var(--accent-hover);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 55%, transparent);
}

.qnav-panel {
  width: min(320px, calc(100vw - 48px));
  max-height: min(360px, calc(100vh - 120px));
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.qnav-head {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.qnav-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
}

.qnav-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  text-align: left;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  transition: background 0.12s;
}

.qnav-item:hover {
  background: var(--accent-dim);
}

.qnav-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-3);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.qnav-label {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>

<style>
[data-qnav].qnav-flash {
  animation: qnav-target-flash 1.2s ease-out;
}

@keyframes qnav-target-flash {
  0%,
  100% {
    box-shadow: none;
  }
  20% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 55%, transparent);
  }
}
</style>
