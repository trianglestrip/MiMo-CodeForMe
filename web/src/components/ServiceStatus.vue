<script setup lang="ts">
import { useServiceStatus } from '@/composables/useServiceStatus'

const { api, fe } = useServiceStatus()
</script>

<template>
  <div class="service-status" aria-label="服务与前端连接状态">
    <span class="status-item" :title="api.detail">
      <span class="status-dot" :class="api.status" aria-hidden="true"></span>
      <span class="status-label">{{ api.label }}</span>
      <span class="status-port">{{ api.port }}</span>
    </span>
    <span class="status-sep" aria-hidden="true"></span>
    <span class="status-item" :title="fe.detail">
      <span class="status-dot" :class="fe.status" aria-hidden="true"></span>
      <span class="status-label">{{ fe.label }}</span>
      <span class="status-port">{{ fe.port }}</span>
    </span>
  </div>
</template>

<style scoped>
.service-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-3);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-3);
  user-select: none;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.status-sep {
  width: 1px;
  height: 12px;
  background: var(--border);
}

.status-label {
  color: var(--text-3);
}

.status-port {
  font-family: ui-monospace, Consolas, monospace;
  color: var(--text-2);
  font-size: 10px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-3);
}

.status-dot.ok {
  background: var(--free-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--free-color) 25%, transparent);
}

.status-dot.fail {
  background: var(--error);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--error) 20%, transparent);
}

.status-dot.checking {
  background: #eab308;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
</style>
