<script setup lang="ts">
import { Link } from '@element-plus/icons-vue'

defineProps<{
  href?: string
}>()
</script>

<template>
  <ElButton
    tag="a"
    class="trace-open-btn"
    :href="href ?? '/trace.html'"
    target="_blank"
    rel="noopener noreferrer"
    size="small"
    plain
  >
    <ElIcon><Link /></ElIcon>
    Trace
  </ElButton>
</template>

<style scoped>
.trace-open-btn {
  text-decoration: none;
}
</style>
