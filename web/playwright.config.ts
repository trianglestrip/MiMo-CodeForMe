import { defineConfig } from '@playwright/test'

const webPort = process.env.VITE_DEV_SERVER_PORT ?? '7000'
const baseURL = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL,
    headless: true,
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
