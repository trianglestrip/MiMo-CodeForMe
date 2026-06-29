<script setup lang="ts">
import { inject, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Paperclip, Plus, VideoPause, Delete } from '@element-plus/icons-vue'
import { TURN_ENGINE_KEY } from '@/composables/turn/useTurnEngine'
import { useComposerActions } from '@/composables/useComposerActions'
import {
  attachmentKind,
  filesToAttachments,
  MAX_ATTACHMENTS,
  mimeBadge,
} from '@/lib/composer/attachments'
import MessageQueuePanel from './MessageQueuePanel.vue'

const engine = inject(TURN_ENGINE_KEY)
if (!engine) throw new Error('ChatComposer requires turnEngine')

const {
  input,
  attachments,
  placeholder,
  actionMode,
  canAction,
  isRunning,
  onKeydown,
  onActionClick,
  addAttachments,
  removeAttachment,
} = useComposerActions(engine)

const attachInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function imagePreviewList() {
  return attachments.value.filter((a) => attachmentKind(a.mime) === 'image').map((a) => a.url)
}

async function pickFiles(fileList: FileList | File[] | null) {
  if (!fileList?.length) return
  try {
    const items = await filesToAttachments(Array.from(fileList), attachments.value.length)
    addAttachments(items)
  } catch (e) {
    ElMessage.warning(e instanceof Error ? e.message : '添加附件失败')
  }
}

function openFilePicker() {
  attachInput.value?.click()
}

async function onFileInputChange(e: Event) {
  const inputEl = e.target as HTMLInputElement
  await pickFiles(inputEl.files)
  inputEl.value = ''
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (!files.length) return
  e.preventDefault()
  void pickFiles(files)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  e.preventDefault()
  void pickFiles(e.dataTransfer?.files ?? null)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}
</script>

<template>
  <div class="chat-composer">
    <MessageQueuePanel
      :items="engine.queue.value"
      :running="engine.turnState.value === 'running'"
      @update="engine.updateQueued"
      @remove="engine.removeQueued"
      @run-now="(id) => void engine.runQueuedNow(id)"
    />

    <div
      class="composer-panel"
      :class="{ 'is-dragging': dragging }"
      @paste="onPaste"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <input
        ref="attachInput"
        type="file"
        class="hidden-input"
        multiple
        @change="onFileInputChange"
      />

      <div v-if="attachments.length" class="attachment-row">
        <div
          v-for="file in attachments"
          :key="file.id"
          class="attachment-item"
          :class="`kind-${attachmentKind(file.mime)}`"
        >
          <ElImage
            v-if="attachmentKind(file.mime) === 'image'"
            :src="file.url"
            fit="cover"
            class="thumb"
            :preview-src-list="imagePreviewList()"
            :initial-index="imagePreviewList().indexOf(file.url)"
          />
          <div v-else class="file-chip" :title="file.filename">
            <ElTag size="small" effect="dark" class="file-badge">{{ mimeBadge(file.mime) }}</ElTag>
            <span class="file-name">{{ file.filename }}</span>
          </div>
          <ElButton
            :icon="Delete"
            circle
            size="small"
            type="danger"
            class="remove-btn"
            title="移除附件"
            @click="removeAttachment(file.id)"
          />
        </div>
        <button
          v-if="attachments.length < MAX_ATTACHMENTS"
          type="button"
          class="add-btn"
          title="继续添加附件"
          @click="openFilePicker"
        >
          <ElIcon :size="18"><Plus /></ElIcon>
        </button>
      </div>

      <div class="input-row">
        <ElButton
          class="side-btn attach-btn"
          :icon="Paperclip"
          :disabled="attachments.length >= MAX_ATTACHMENTS"
          :title="attachments.length
            ? `附件 ${attachments.length}/${MAX_ATTACHMENTS}（可拖拽或 Ctrl+V）`
            : '添加附件：图片、PDF、文本等（可拖拽或 Ctrl+V）'"
          @click="openFilePicker"
        />

        <ElInput
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 6 }"
          :placeholder="placeholder"
          class="main-input"
          @keydown="onKeydown"
        />

        <ElButton
          v-if="actionMode === 'stop'"
          type="danger"
          :icon="VideoPause"
          class="side-btn action-btn"
          title="停止当前回答"
          @click="onActionClick"
        />
        <ElButton
          v-else
          type="primary"
          class="side-btn action-btn"
          :disabled="!canAction"
          :title="isRunning ? '排队发送（Enter）' : '发送（Enter）'"
          @click="onActionClick"
        >
          <i class="fa-solid fa-arrow-turn-down send-icon" aria-hidden="true" />
        </ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-composer {
  padding: 12px 32px 14px;
  background: var(--bg-2);
}

.chat-composer > * {
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}

.composer-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  overflow: hidden;
  box-shadow: 0 1px 4px color-mix(in srgb, var(--text) 5%, transparent);
  transition: border-color 0.15s, background 0.15s;
}

.composer-panel.is-dragging {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, var(--bg));
}

.hidden-input {
  display: none;
}

.attachment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 0;
}

.attachment-item {
  position: relative;
  flex-shrink: 0;
}

.thumb {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-2);
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 180px;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
}

.file-badge {
  flex-shrink: 0;
  border: none;
}

.kind-pdf .file-badge {
  background: var(--accent);
}

.kind-text .file-badge {
  background: var(--phase-step);
}

.kind-file .file-badge {
  background: var(--text-3);
}

.file-name {
  font-size: 12px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  padding: 0;
  box-shadow: 0 1px 4px color-mix(in srgb, var(--text) 18%, transparent);
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  color: var(--text-3);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px;
}

.side-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0;
  border-radius: var(--radius-sm);
}

.attach-btn {
  background: var(--bg-2);
  border: 1px solid var(--border);
  color: var(--text-2);
}

.attach-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: var(--accent-dim);
}

.main-input {
  flex: 1;
  min-width: 0;
}

.main-input :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  padding: 9px 4px;
  min-height: 40px !important;
  font-size: 14px;
  line-height: 1.5;
  background: transparent;
  color: var(--text);
  resize: none;
}

.main-input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.action-btn {
  font-size: 18px;
}

.send-icon {
  font-size: 17px;
  line-height: 1;
}
</style>
