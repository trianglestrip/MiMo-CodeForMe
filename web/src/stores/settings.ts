import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getWorkDir, setWorkDir as persistWorkDir, WORK_DIR_CHANGED, ensureWorkDirAllowed } from '@/lib/workDir'
import { fetchProviders } from '@/lib/mimo/client'

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

const MODEL_STORAGE_KEY = 'bcai-selected-model'

const GREEN_MODEL_ORDER = [
  { provider: 'mimo', id: 'mimo-auto' },
  { provider: 'deepseek', id: 'deepseek-v4-flash' },
  { provider: 'deepseek', id: 'deepseek-v4-pro' },
] as const

function modelDescription(provider: string, id: string): string {
  if (provider === 'mimo') return '免费通道 · MiMo Auto'
  if (id === 'deepseek-v4-flash') return '官方通道 · DeepSeek V4 Flash'
  if (id === 'deepseek-v4-pro') return '官方通道 · DeepSeek V4 Pro'
  return `via ${provider}/${id}`
}

function fallbackModels(): ModelInfo[] {
  return [
    {
      id: 'mimo-auto',
      name: 'MiMo Auto',
      provider: 'mimo',
      free: true,
      description: modelDescription('mimo', 'mimo-auto'),
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
    {
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      provider: 'deepseek',
      free: false,
      description: modelDescription('deepseek', 'deepseek-v4-flash'),
      contextWindow: 128000,
      capabilities: {
        toolCall: true,
        reasoning: false,
        attachment: false,
        structuredOutput: false,
        inputModalities: ['text'],
        outputModalities: ['text'],
        contextWindow: 128000,
        maxOutput: 8192,
        upstreamAvailable: true,
      },
      slashCommands: [],
    },
    {
      id: 'deepseek-v4-pro',
      name: 'DeepSeek V4 Pro',
      provider: 'deepseek',
      free: false,
      description: modelDescription('deepseek', 'deepseek-v4-pro'),
      contextWindow: 128000,
      capabilities: {
        toolCall: true,
        reasoning: true,
        attachment: false,
        structuredOutput: false,
        inputModalities: ['text'],
        outputModalities: ['text'],
        contextWindow: 128000,
        maxOutput: 8192,
        upstreamAvailable: true,
      },
      slashCommands: [],
    },
  ]
}

function toModelInfo(providerID: string, model: {
  id: string
  name: string
  limit?: { context?: number; output?: number }
  capabilities?: { toolcall?: boolean; reasoning?: boolean }
}): ModelInfo {
  const contextWindow = model.limit?.context ?? 128000
  const maxOutput = model.limit?.output ?? 8192
  return {
    id: model.id,
    name: model.name,
    provider: providerID,
    free: providerID === 'mimo',
    description: modelDescription(providerID, model.id),
    contextWindow,
    capabilities: {
      toolCall: model.capabilities?.toolcall ?? true,
      reasoning: model.capabilities?.reasoning ?? false,
      attachment: false,
      structuredOutput: false,
      inputModalities: ['text'],
      outputModalities: ['text'],
      contextWindow,
      maxOutput,
      upstreamAvailable: true,
    },
    slashCommands: [],
  }
}

function loadStoredModel(): { provider: string; model: string } | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { provider?: string; model?: string }
    if (parsed.provider && parsed.model) return { provider: parsed.provider, model: parsed.model }
  } catch {
    // ignore
  }
  return undefined
}

function persistModel(providerID: string, modelID: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify({ provider: providerID, model: modelID }))
}

export const useSettingsStore = defineStore('settings', () => {
  const provider = ref('mimo')
  const model = ref('mimo-auto')
  const models = ref<ModelInfo[]>(fallbackModels())
  const modelsLoaded = ref(false)
  const settingsOpen = ref(false)
  const workDir = ref(getWorkDir())

  const currentModel = computed(() => models.value.find(m => m.id === model.value && m.provider === provider.value))
  const slashCommands = computed(() => currentModel.value?.slashCommands ?? [])

  function applySelection(nextProvider: string, nextModel: string) {
    provider.value = nextProvider
    model.value = nextModel
    persistModel(nextProvider, nextModel)
  }

  function selectModel(m: ModelInfo) {
    applySelection(m.provider, m.id)
  }

  function initWorkDir() {
    workDir.value = ensureWorkDirAllowed()
    if (typeof window !== 'undefined') {
      window.addEventListener(WORK_DIR_CHANGED, onWorkDirChanged)
      window.addEventListener('storage', onStorage)
    }
  }

  function onWorkDirChanged() {
    workDir.value = getWorkDir()
    void fetchModels()
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
    const directory = getWorkDir().trim()
    const fallback = fallbackModels()
    if (!directory) {
      models.value = fallback
      modelsLoaded.value = true
      return
    }
    try {
      const result = await fetchProviders(directory)
      const connected = new Set(result.connected)
      const byKey = new Map<string, ModelInfo>()
      for (const p of result.all) {
        if (!connected.has(p.id)) continue
        for (const m of Object.values(p.models)) {
          byKey.set(`${p.id}/${m.id}`, toModelInfo(p.id, m))
        }
      }
      const next = GREEN_MODEL_ORDER.flatMap(({ provider: providerID, id }) => {
        const hit = byKey.get(`${providerID}/${id}`)
        return hit ? [hit] : []
      })
      models.value = next.length ? next : fallback.filter((m) => connected.has(m.provider))
      const stored = loadStoredModel()
      const pick =
        (stored && models.value.find((m) => m.provider === stored.provider && m.id === stored.model)) ??
        models.value.find((m) => m.provider === 'mimo' && m.id === 'mimo-auto') ??
        models.value[0]
      if (pick) applySelection(pick.provider, pick.id)
    } catch {
      models.value = fallback
      const stored = loadStoredModel()
      const pick =
        (stored && fallback.find((m) => m.provider === stored.provider && m.id === stored.model)) ?? fallback[0]
      applySelection(pick.provider, pick.id)
    } finally {
      modelsLoaded.value = true
    }
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
