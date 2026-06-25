<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    panelWidth?: string
    align?: 'left' | 'right'
  }>(),
  { panelWidth: '280px', align: 'right' },
)

const open = ref(false)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}
</script>

<template>
  <div class="header-popover" v-click-outside="close">
    <div class="trigger-wrap" @click="toggle">
      <slot name="trigger" :open="open" />
    </div>
    <div
      v-if="open"
      class="dropdown"
      :class="`align-${align}`"
      :style="{ width: panelWidth }"
    >
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.header-popover {
  position: relative;
}

.trigger-wrap {
  display: inline-flex;
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 100;
  overflow: hidden;
}

.dropdown.align-right {
  right: 0;
}

.dropdown.align-left {
  left: 0;
}
</style>
