<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

withDefaults(
  defineProps<{
    block?: boolean
  }>(),
  { block: false },
)

const theme = useThemeStore()
</script>

<template>
  <ElButton
    class="theme-toggle-btn"
    :class="{ 'theme-toggle-block': block }"
    size="small"
    :icon="theme.current === 'light' ? Moon : Sunny"
    :title="theme.current === 'light' ? '切换到深色模式' : '切换到浅色模式'"
    @click="theme.toggle()"
  >
    {{ theme.current === 'light' ? '深色' : '浅色' }}
  </ElButton>
</template>

<style scoped>
.theme-toggle-block {
  width: 100%;
}
</style>
