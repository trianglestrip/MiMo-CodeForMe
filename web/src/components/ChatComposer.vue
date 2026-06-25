<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string, images: string[]]
}>()

const input = ref('')
const fileInputEl = ref<HTMLInputElement | null>(null)
const pendingImages = ref<string[]>([])

const canSend = computed(
  () => (input.value.trim() || pendingImages.value.length) && !props.disabled,
)

const placeholder = computed(() =>
  props.disabled ? '等待回答完成…' : '发送消息…',
)

const sendTitle = computed(() =>
  props.disabled ? '等待当前回答完成' : '发送',
)

async function submit() {
  if (!canSend.value) return
  const text = input.value.trim()
  const images = [...pendingImages.value]
  input.value = ''
  pendingImages.value = []
  emit('send', text || '请分析这张图片', images)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    submit()
  }
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) addImageFile(file)
    }
  }
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  Array.from(files).forEach(addImageFile)
  if (fileInputEl.value) fileInputEl.value.value = ''
}

function addImageFile(file: File) {
  if (pendingImages.value.length >= 4) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const url = ev.target?.result as string
    if (url) pendingImages.value.push(url)
  }
  reader.readAsDataURL(file)
}

function removeImage(idx: number) {
  pendingImages.value.splice(idx, 1)
}
</script>

<template>
  <div class="chat-composer">
    <div v-if="pendingImages.length" class="image-previews">
      <div v-for="(img, i) in pendingImages" :key="i" class="image-preview-wrap">
        <img :src="img" class="image-thumb" alt="附图" />
        <button type="button" class="image-remove" title="移除" @click="removeImage(i)">✕</button>
      </div>
    </div>

    <div class="input-box" @paste="onPaste">
      <input
        ref="fileInputEl"
        type="file"
        accept="image/*"
        multiple
        class="file-input-hidden"
        @change="onFileChange"
      />
      <button
        class="attach-btn"
        type="button"
        :disabled="pendingImages.length >= 4"
        title="上传图片 (也可直接粘贴)"
        @click="fileInputEl?.click()"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
      <input
        v-model="input"
        type="text"
        class="input-field"
        :placeholder="placeholder"
        @keydown="onKeydown"
      />
      <button
        class="send-btn"
        type="button"
        :class="{ active: canSend }"
        :disabled="!canSend"
        :title="sendTitle"
        @click="submit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-composer {
  padding: 12px 32px 10px;
  background: var(--bg-2);
}

.chat-composer > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  transition: border-color 0.15s;
}

.input-box:focus-within {
  border-color: var(--accent);
}

.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.image-preview-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}

.image-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.image-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--error);
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.file-input-hidden {
  display: none;
}

.attach-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-3);
  transition: color 0.15s, background 0.15s;
}

.attach-btn:hover:not(:disabled) {
  color: var(--accent);
  background: var(--bg-2);
}

.attach-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-field {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 14px;
  line-height: 32px;
  height: 32px;
  min-width: 0;
  padding: 0;
}

.input-field::placeholder {
  color: var(--text-3);
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-3);
  background: var(--bg-2);
  border: 1px solid var(--border);
  transition: all 0.15s;
}

.send-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.send-btn.active:hover {
  background: var(--accent-hover);
}
</style>
