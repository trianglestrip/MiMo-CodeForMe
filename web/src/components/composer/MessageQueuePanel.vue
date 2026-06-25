<script setup lang="ts">
import { ref } from 'vue'
import type { QueuedMessage } from '@/stores/turnQueue'

const R = 'fa-regular'

defineProps<{
  items: QueuedMessage[]
  running?: boolean
}>()

const emit = defineEmits<{
  update: [id: string, content: string]
  remove: [id: string]
  runNow: [id: string]
}>()

const editingId = ref<string | null>(null)
const editDraft = ref('')

function startEdit(item: QueuedMessage) {
  editingId.value = item.id
  editDraft.value = item.content
}

function cancelEdit() {
  editingId.value = null
  editDraft.value = ''
}

function saveEdit(id: string) {
  emit('update', id, editDraft.value)
  cancelEdit()
}

function onEditKeydown(e: KeyboardEvent, id: string) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    saveEdit(id)
  }
  if (e.key === 'Escape') cancelEdit()
}
</script>

<template>
  <div v-if="items.length" class="queue-panel">
    <div class="queue-banner">
      <span class="queue-banner-text">排队中</span>
      <ElTag round size="small" type="warning" effect="dark">{{ items.length }}</ElTag>
    </div>

    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="queue-row"
      :class="{ 'is-editing': editingId === item.id }"
    >
      <ElTag round size="small" class="queue-index" type="info" effect="plain">{{ index + 1 }}</ElTag>

      <div class="queue-chip">
        <span v-if="item.attachments.length" class="queue-attach" :title="`${item.attachments.length} 个附件`">
          <i :class="[R, 'fa-paperclip']" aria-hidden="true" />
        </span>

        <ElInput
          v-if="editingId === item.id"
          v-model="editDraft"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 6 }"
          class="queue-edit"
          autofocus
          @keydown="onEditKeydown($event, item.id)"
          @blur="saveEdit(item.id)"
        />
        <div v-else class="queue-text" :title="item.content">{{ item.content }}</div>

        <div class="queue-actions" @mousedown.prevent>
          <button
            v-if="editingId !== item.id"
            type="button"
            class="queue-icon-btn"
            title="编辑"
            @click="startEdit(item)"
          >
            <i :class="[R, 'fa-pen-to-square']" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="queue-icon-btn queue-icon-primary"
            :title="running ? '停止当前回答并执行此条' : '立即执行此条'"
            @click="emit('runNow', item.id)"
          >
            <i class="fa-solid fa-arrow-up queue-run-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="queue-icon-btn queue-icon-danger"
            title="移除"
            @click="emit('remove', item.id)"
          >
            <i :class="[R, 'fa-trash-can']" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  margin-bottom: 8px;
  width: 100%;
}

.queue-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-end;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--warn) 18%, var(--bg-2));
  border: 1px solid color-mix(in srgb, var(--warn) 45%, var(--border));
}

.queue-banner-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--warn);
  letter-spacing: 0.02em;
}

.queue-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  max-width: min(88%, 680px);
  margin-left: auto;
}

.queue-index {
  flex-shrink: 0;
  min-width: 24px;
  text-align: center;
  font-weight: 600;
}

.queue-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 34px;
  padding: 5px 8px 5px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-2);
}

.queue-row.is-editing .queue-chip {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: color-mix(in srgb, var(--accent) 5%, var(--bg-2));
}

.queue-attach {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1;
}

.queue-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  max-height: 40px;
  color: var(--text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  word-break: break-word;
  cursor: default;
}

.queue-edit {
  flex: 1;
  min-width: 0;
}

.queue-edit :deep(.el-textarea__inner) {
  padding: 2px 6px;
  min-height: 20px !important;
  font-size: 13px;
  line-height: 20px;
  resize: none;
  box-shadow: none;
  background: transparent;
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.queue-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s, background 0.15s;
}

.queue-icon-btn:hover {
  color: var(--text);
  background: var(--bg-3);
}

.queue-run-icon {
  display: block;
  font-size: 13px;
  line-height: 1;
}

.queue-icon-primary:hover {
  color: var(--accent);
  background: var(--accent-dim);
}

.queue-icon-danger:hover {
  color: var(--error);
  background: color-mix(in srgb, var(--error) 10%, transparent);
}
</style>
