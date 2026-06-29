<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
</script>

<template>
  <div class="msg-sk">
    <div class="msg-sk-row is-user">
      <SkeletonBlock width="42%" height="36px" radius="12px" />
    </div>
    <div class="msg-sk-row is-assistant">
      <SkeletonBlock width="68%" height="14px" />
      <SkeletonBlock width="52%" height="14px" />
      <SkeletonBlock width="44%" height="14px" />
    </div>
    <div class="msg-sk-row is-user">
      <SkeletonBlock width="36%" height="32px" radius="12px" />
    </div>
    <div class="msg-sk-row is-assistant">
      <SkeletonBlock width="72%" height="14px" />
      <SkeletonBlock width="61%" height="14px" />
    </div>
  </div>
</template>

<style scoped>
.msg-sk {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 32px;
}

.msg-sk-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-sk-row.is-user {
  align-items: flex-end;
}

.msg-sk-row.is-assistant {
  align-items: flex-start;
}
</style>
