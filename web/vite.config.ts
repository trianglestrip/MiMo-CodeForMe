import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import { resolve } from 'path'

const repoRoot = resolve(__dirname, '..').replace(/\\/g, '/')

function mimoTraceConfigJs(devProxy: boolean) {
  const baseUrl = devProxy ? '/mimo' : 'http://127.0.0.1:4096'
  return `window.MIMO_TRACE_CONFIG = {
  baseUrl: '${baseUrl}',
  username: 'mimocode',
  password: 'mimocode-standalone',
}
`
}

function writeTraceConfig(devProxy: boolean) {
  fs.writeFileSync(resolve(__dirname, 'public/mimo-config.js'), mimoTraceConfigJs(devProxy))
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'mimo-workdir',
      config(_, env) {
        const workDir = process.env.VITE_MIMO_WORK_DIR?.trim() || repoRoot
        const devProxy = env.command === 'serve'
        writeTraceConfig(devProxy)
        return {
          define: {
            __DEFAULT_MIMO_WORK_DIR__: JSON.stringify(devProxy ? workDir : ''),
          },
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trace: resolve(__dirname, 'trace.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // 仅代理 API 路径（/mimo/...），避免误匹配 /mimo-config.js
      '/mimo/': {
        target: 'http://127.0.0.1:4096',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mimo/, ''),
      },
    },
  },
})
