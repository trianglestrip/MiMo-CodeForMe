import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://127.0.0.1:5173/'

const consoleLogs = []
const pageErrors = []
const failedRequests = []

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', (msg) => {
  const type = msg.type()
  if (type === 'log' || type === 'debug') return
  consoleLogs.push({ type, text: msg.text(), location: msg.location() })
})

page.on('pageerror', (err) => {
  pageErrors.push(String(err))
})

page.on('requestfailed', (req) => {
  failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'failed'}`)
})

const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(4000)

const title = await page.title()
const hasComposer = await page.locator('.chat-composer, .composer-panel').count()
const hasSidebar = await page.locator('.sidebar').count()

console.log('=== Playwright verify ===')
console.log('URL:', url)
console.log('Status:', response?.status())
console.log('Title:', title)
console.log('Sidebar:', hasSidebar > 0)
console.log('Composer:', hasComposer > 0)

if (pageErrors.length) {
  console.log('\n--- pageerror ---')
  for (const e of pageErrors) console.log(e)
}

if (consoleLogs.length) {
  console.log('\n--- console (warn/error) ---')
  for (const e of consoleLogs) console.log(`[${e.type}]`, e.text)
}

if (failedRequests.length) {
  console.log('\n--- failed requests ---')
  for (const r of failedRequests) console.log(r)
}

await browser.close()

const bad = pageErrors.length + consoleLogs.filter((x) => x.type === 'error').length
process.exit(bad > 0 ? 1 : 0)
