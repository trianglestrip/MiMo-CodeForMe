<script setup lang="ts">
defineProps<{
  href: string
  title?: string
  external?: boolean
}>()
</script>

<template>
  <a
    :href="href"
    class="nav-link"
    :title="title"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot />
  </a>
</template>

<style scoped>
.nav-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.nav-link:hover {
  background: var(--accent-dim);
}
</style>
