import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWorkDir, setWorkDir as persistWorkDir, WORK_DIR_CHANGED } from '@/lib/workDir'

export interface SlashCommand {
  name: string
  label: string
  description: string
  messageTemplate?: string
}

export interface ModelCapabilities {
  toolCall: boolean
  reasoning: boolean
  attachment: boolean
  structuredOutput: boolean
  inputModalities: string[]
  outputModalities: string[]
  contextWindow: number
  maxOutput: number
  upstreamAvailable: boolean
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  free: boolean
  description: string
  contextWindow: number
  capabilities: ModelCapabilities
  slashCommands: SlashCommand[]
}

export const useSettingsStore = defineStore('settings', () => {
  const provider = ref('mimo')
  const model = ref('mimo-auto')
  const models = ref<ModelInfo[]>([
    {
      id: 'mimo-auto',
      name: 'MiMo Auto',
      provider: 'mimo',
      free: true,
      description: 'via mimo serve',
      contextWindow: 200000,
      capabilities: {
        toolCall: true,
        reasoning: true,
        attachment: false,
        structuredOutput: false,
        inputModalities: ['text'],
        outputModalities: ['text'],
        contextWindow: 200000,
        maxOutput: 8192,
        upstreamAvailable: true,
      },
      slashCommands: [],
    },
  ])
  const modelsLoaded = ref(true)
  const settingsOpen = ref(false)
  const workDir = ref(getWorkDir())

  const currentModel = computed(() => models.value.find(m => m.id === model.value))
  const slashCommands = computed(() => currentModel.value?.slashCommands ?? [])

  function selectModel(m: ModelInfo) {
    model.value = m.id
    provider.value = m.provider
  }

  function initWorkDir() {
    workDir.value = getWorkDir()
    if (typeof window !== 'undefined') {
      window.addEventListener(WORK_DIR_CHANGED, onWorkDirChanged)
      window.addEventListener('storage', onStorage)
    }
  }

  function onWorkDirChanged() {
    workDir.value = getWorkDir()
  }

  function onStorage(e: StorageEvent) {
    if (e.key === 'bcai-work-dir') workDir.value = getWorkDir()
  }

  function setWorkDir(path: string) {
    persistWorkDir(path)
    workDir.value = getWorkDir()
  }

  async function fetchWorkspace() {
    workDir.value = getWorkDir()
  }

  async function fetchModels() {
    modelsLoaded.value = true
  }

  return {
    provider,
    model,
    models,
    slashCommands,
    currentModel,
    modelsLoaded,
    settingsOpen,
    workDir,
    fetchModels,
    fetchWorkspace,
    initWorkDir,
    setWorkDir,
    selectModel,
  }
})
