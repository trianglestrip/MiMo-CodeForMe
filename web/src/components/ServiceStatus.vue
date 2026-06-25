<script setup lang="ts">
import { useServiceStatus } from '@/composables/useServiceStatus'
import type { LinkStatus } from '@/composables/useServiceStatus'

const { api, fe } = useServiceStatus()

function dotClass(status: LinkStatus) {
  if (status === 'ok') return 'status-dot-ok'
  if (status === 'fail') return 'status-dot-fail'
  return 'status-dot-checking'
}

function chipClass(status: LinkStatus) {
  if (status === 'ok') return 'status-chip-ok'
  if (status === 'fail') return 'status-chip-fail'
  return 'status-chip-checking'
}
</script>

<template>
  <div class="service-status" aria-label="服务与前端连接状态">
    <ElButton class="status-chip" :class="chipClass(api.status)" :title="api.detail">
      <span class="chip-inner">
        <span class="status-dot-wrap" aria-hidden="true">
          <span class="status-ring status-ring-outer" :class="dotClass(api.status)" />
          <span class="status-ring" :class="dotClass(api.status)" />
          <span class="status-dot" :class="dotClass(api.status)" />
        </span>
        <span class="status-label">{{ api.label }} {{ api.port }}</span>
      </span>
    </ElButton>
    <ElButton class="status-chip" :class="chipClass(fe.status)" :title="fe.detail">
      <span class="chip-inner">
        <span class="status-dot-wrap" aria-hidden="true">
          <span class="status-ring status-ring-outer" :class="dotClass(fe.status)" />
          <span class="status-ring" :class="dotClass(fe.status)" />
          <span class="status-dot" :class="dotClass(fe.status)" />
        </span>
        <span class="status-label">{{ fe.label }} {{ fe.port }}</span>
      </span>
    </ElButton>
  </div>
</template>

<style scoped>
.service-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-chip {
  height: 32px;
  padding: 0 12px;
  cursor: default;
  transition: border-color 0.2s, background-color 0.2s;
}

.status-chip:hover,
.status-chip:focus {
  color: var(--el-button-text-color);
}

.status-chip-ok:hover,
.status-chip-ok:focus {
  border-color: color-mix(in srgb, var(--free-color) 45%, var(--border));
  background: color-mix(in srgb, var(--free-color) 6%, var(--bg));
}

.status-chip-checking:hover,
.status-chip-checking:focus {
  border-color: color-mix(in srgb, var(--warn) 50%, var(--border));
  background: color-mix(in srgb, var(--warn) 12%, var(--bg));
}

.status-chip-fail:hover,
.status-chip-fail:focus {
  border-color: color-mix(in srgb, var(--error) 55%, var(--border));
  background: color-mix(in srgb, var(--error) 8%, var(--bg));
}

.status-chip-ok {
  border-color: color-mix(in srgb, var(--free-color) 28%, var(--border));
  background: color-mix(in srgb, var(--free-color) 4%, var(--bg));
}

.status-chip-checking {
  border-color: color-mix(in srgb, var(--warn) 38%, var(--border));
  background: color-mix(in srgb, var(--warn) 10%, var(--bg));
}

.status-chip-fail {
  border-color: color-mix(in srgb, var(--error) 38%, var(--border));
  background: color-mix(in srgb, var(--error) 5%, var(--bg));
}

.status-chip :deep(> span) {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.chip-inner {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  line-height: 1;
}

.status-dot-wrap {
  position: relative;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  position: relative;
  z-index: 2;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 50%;
  pointer-events: none;
}

.status-ring-outer {
  z-index: 0;
}

.status-dot.status-dot-ok {
  background: var(--free-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--free-color) 35%, transparent);
  animation: status-dot-breathe 2s ease-in-out infinite;
}

.status-ring.status-dot-ok {
  animation: status-ring-ok 2s ease-out infinite;
}

.status-ring-outer.status-dot-ok {
  animation: status-ring-ok 2s ease-out 1s infinite;
}

.status-dot.status-dot-checking {
  background: var(--warn);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--warn) 45%, transparent);
  animation: status-dot-pulse 0.9s ease-in-out infinite;
}

.status-ring.status-dot-checking {
  animation: status-ring-checking 1.2s ease-out infinite;
}

.status-ring-outer.status-dot-checking {
  animation: status-ring-checking 1.2s ease-out 0.6s infinite;
}

.status-dot.status-dot-fail {
  background: var(--error);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--error) 45%, transparent);
  animation: status-dot-pulse 0.65s ease-in-out infinite;
}

.status-ring.status-dot-fail {
  animation: status-ring-fail 0.9s ease-out infinite;
}

.status-ring-outer.status-dot-fail {
  animation: status-ring-fail 0.9s ease-out 0.45s infinite;
}

.status-label {
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
}

.status-chip-fail .status-label {
  color: var(--error);
}

.status-chip-checking .status-label {
  color: var(--warn);
}

@keyframes status-dot-breathe {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--free-color) 30%, transparent);
  }
  50% {
    transform: scale(1.12);
    box-shadow: 0 0 5px 1px color-mix(in srgb, var(--free-color) 45%, transparent);
  }
}

@keyframes status-dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.72);
  }
}

@keyframes status-ring-ok {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--free-color) 60%, transparent);
    opacity: 0.9;
  }
  100% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--free-color) 0%, transparent);
    opacity: 0;
  }
}

@keyframes status-ring-checking {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--warn) 70%, transparent);
    opacity: 0.9;
  }
  100% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--warn) 0%, transparent);
    opacity: 0;
  }
}

@keyframes status-ring-fail {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--error) 70%, transparent);
    opacity: 0.95;
  }
  100% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--error) 0%, transparent);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot,
  .status-ring {
    animation: none !important;
  }

  .status-dot.status-dot-ok {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--free-color) 30%, transparent);
  }

  .status-dot.status-dot-checking {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--warn) 40%, transparent);
  }

  .status-dot.status-dot-fail {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--error) 40%, transparent);
  }
}
</style>
