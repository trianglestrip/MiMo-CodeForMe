<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <ElAlert
    type="error"
    :title="message"
    show-icon
    closable
    class="error-bar"
    @close="emit('dismiss')"
  />
</template>

<style scoped>
.error-bar {
  flex-shrink: 0;
  border-radius: 0;
  border-top: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
}
</style>
