/// <reference types="vite/client" />

declare const __DEFAULT_MIMO_WORK_DIR__: string

interface ImportMetaEnv {
  readonly VITE_MIMO_SERVER_URL?: string
  readonly VITE_MIMO_SERVER_USER?: string
  readonly VITE_MIMO_SERVER_PASSWORD?: string
  readonly VITE_MIMO_WORK_DIR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
