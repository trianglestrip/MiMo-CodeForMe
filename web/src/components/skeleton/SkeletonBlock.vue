<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  {
    width: '100%',
    height: '14px',
    radius: 'var(--radius-sm)',
  },
)
</script>

<template>
  <span
    class="sk-block"
    :style="{ width, height, borderRadius: radius }"
    aria-hidden="true"
  />
</template>
