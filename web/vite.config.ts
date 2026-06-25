import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import { resolve } from 'path'

const repoRoot = resolve(__dirname, '..').replace(/\\/g, '/')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devPort = Number(env.VITE_DEV_SERVER_PORT) || 7000
  const mimoServerUrl = (env.VITE_MIMO_SERVER_URL ?? 'http://127.0.0.1:9000').replace(/\/$/, '')

  function mimoTraceConfigJs(devProxy: boolean) {
    const baseUrl = devProxy ? '/mimo' : mimoServerUrl
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

  return {
    plugins: [
      vue(),
      {
        name: 'mimo-workdir',
        config(_, env) {
          const workDir = process.env.VITE_MIMO_WORK_DIR?.trim() || repoRoot
          const devProxy = env.command === 'serve'
          if (devProxy) writeTraceConfig(true)
          return {
            define: {
              __DEFAULT_MIMO_WORK_DIR__: JSON.stringify(devProxy ? workDir : ''),
            },
          }
        },
        closeBundle() {
          const out = resolve(__dirname, 'dist/mimo-config.js')
          fs.mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
          fs.writeFileSync(out, mimoTraceConfigJs(false))
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          trace: resolve(__dirname, 'trace.html'),
          shapes: resolve(__dirname, 'shapes.html'),
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
      port: devPort,
      strictPort: true,
      proxy: {
        '/mimo/': {
          target: mimoServerUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mimo/, ''),
        },
      },
    },
  }
})
