<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'

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

const atBottom = ref(true)

const BOTTOM_THRESHOLD = 32

function updateAtBottom() {
  const root = props.scrollRoot
  if (!root) {
    atBottom.value = true
    return
  }
  atBottom.value =
    root.scrollTop + root.clientHeight >= root.scrollHeight - BOTTOM_THRESHOLD
}

function scrollToTop() {
  const root = props.scrollRoot
  if (!root) return
  root.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToBottom() {
  const root = props.scrollRoot
  if (!root) return
  root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' })
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
}

let resizeObserver: ResizeObserver | null = null

function bindScrollRoot(root: HTMLElement | null | undefined) {
  if (!root) return
  root.addEventListener('scroll', updateAtBottom, { passive: true })
  resizeObserver = new ResizeObserver(updateAtBottom)
  resizeObserver.observe(root)
  const view = root.firstElementChild
  if (view instanceof HTMLElement) resizeObserver.observe(view)
  updateAtBottom()
}

function unbindScrollRoot(root: HTMLElement | null | undefined) {
  if (!root) return
  root.removeEventListener('scroll', updateAtBottom)
  resizeObserver?.disconnect()
  resizeObserver = null
}

watch(
  () => props.scrollRoot,
  (root, prev) => {
    unbindScrollRoot(prev)
    bindScrollRoot(root)
  },
  { immediate: true },
)

watch(
  () => props.items.length,
  () => nextTick(updateAtBottom),
)

onMounted(updateAtBottom)
onUnmounted(() => unbindScrollRoot(props.scrollRoot))
</script>

<template>
  <div
    v-if="items.length"
    class="qnav-wrap"
    :style="{ bottom: `${offsetBottom}px` }"
  >
    <ElPopover
      placement="top-end"
      :width="320"
      trigger="hover"
      :show-after="0"
      :hide-after="200"
      :show-arrow="false"
    >
      <template #reference>
        <ElButton
          circle
          size="large"
          class="qnav-scroll-btn qnav-fab"
          title="回到顶部（悬浮查看问题列表）"
          aria-label="回到顶部"
          :icon="Top"
          @click="scrollToTop"
        />
      </template>

      <div class="qnav-head">问题列表 · {{ items.length }}</div>
      <ElScrollbar max-height="320px">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="qnav-item"
          role="button"
          tabindex="0"
          @click="jumpTo(item.id)"
          @keydown.enter="jumpTo(item.id)"
        >
          <ElTag round size="small">{{ index + 1 }}</ElTag>
          <span class="qnav-label">{{ item.label }}</span>
        </div>
      </ElScrollbar>
    </ElPopover>

    <ElButton
      v-if="!atBottom"
      circle
      size="large"
      class="qnav-scroll-btn qnav-down"
      title="跳转到最底部"
      aria-label="跳转到最底部"
      :icon="Bottom"
      @click="scrollToBottom"
    />
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

.qnav-scroll-btn {
  --el-button-bg-color: transparent;
  --el-button-hover-bg-color: transparent;
  --el-button-active-bg-color: transparent;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-2);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.qnav-scroll-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.qnav-head {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.qnav-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.45;
}

.qnav-item:hover {
  background: var(--accent-dim);
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
