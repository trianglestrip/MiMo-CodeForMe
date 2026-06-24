import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mimoConfig } from '@/lib/mimo/config'

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
  const workspacePath = ref('')

  const currentModel = computed(() => models.value.find(m => m.id === model.value))
  const slashCommands = computed(() => currentModel.value?.slashCommands ?? [])

  function selectModel(m: ModelInfo) {
    model.value = m.id
    provider.value = m.provider
  }

  async function fetchWorkspace() {
    workspacePath.value = mimoConfig().workDir
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
    workspacePath,
    fetchModels,
    fetchWorkspace,
    selectModel,
  }
})
