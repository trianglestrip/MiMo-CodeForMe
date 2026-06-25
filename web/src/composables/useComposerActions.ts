import { computed, ref } from 'vue'
import type { TurnEngine } from '@/composables/turn/useTurnEngine'
import {
  defaultPromptForAttachments,
  MAX_ATTACHMENTS,
  type MessageAttachment,
} from '@/lib/composer/attachments'

export function useComposerActions(engine: TurnEngine) {
  const input = ref('')
  const attachments = ref<MessageAttachment[]>([])

  const hasInput = computed(() => Boolean(input.value.trim() || attachments.value.length))
  const isRunning = computed(() => engine.turnState.value === 'running')
  const isStopMode = computed(() => isRunning.value && !hasInput.value)
  const actionMode = computed(() => (isStopMode.value ? 'stop' : 'send'))
  const canAction = computed(() => isStopMode.value || hasInput.value)

  const placeholder = computed(() =>
    isRunning.value
      ? '回答中… Enter 排队 · Ctrl+Enter 立即发送 · Shift+Enter 换行'
      : 'Enter 发送 · Shift+Enter 换行',
  )

  function clearInput() {
    input.value = ''
    attachments.value = []
  }

  function takePayload() {
    const files = [...attachments.value]
    const text = input.value.trim() || (files.length ? defaultPromptForAttachments(files) : '')
    clearInput()
    return { text, attachments: files }
  }

  function submit() {
    if (!hasInput.value) return
    const { text, attachments: files } = takePayload()
    engine.send(text, files)
  }

  function forceSubmit() {
    if (!hasInput.value) return
    const { text, attachments: files } = takePayload()
    void engine.forceSend(text, files)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return
    if (e.shiftKey) return
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      forceSubmit()
      return
    }
    submit()
  }

  function onActionClick() {
    if (isStopMode.value) void engine.stopCurrent()
    else submit()
  }

  function addAttachments(items: MessageAttachment[]) {
    const room = MAX_ATTACHMENTS - attachments.value.length
    if (room <= 0) return
    attachments.value.push(...items.slice(0, room))
  }

  function removeAttachment(id: string) {
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  return {
    input,
    attachments,
    hasInput,
    isRunning,
    isStopMode,
    actionMode,
    canAction,
    placeholder,
    submit,
    forceSubmit,
    onKeydown,
    onActionClick,
    addAttachments,
    removeAttachment,
  }
}
