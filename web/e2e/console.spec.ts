import { test, expect } from '@playwright/test'

function collectConsole(page: import('@playwright/test').Page) {
  const errors: string[] = []
  const warnings: string[] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') errors.push(text)
    if (msg.type() === 'warning') warnings.push(text)
  })

  page.on('pageerror', (err) => {
    errors.push(String(err))
  })

  return { errors, warnings }
}

test('chat 页无控制台 error', async ({ page }) => {
  const { errors, warnings } = collectConsole(page)

  const res = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(200)

  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.chat-composer')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(3000)

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
  expect(warnings.filter((w) => /\[Vue warn\]|Uncaught|TypeError|ReferenceError/.test(w)), warnings.join('\n')).toEqual([])
})

test('trace 页无控制台 error', async ({ page }) => {
  const { errors, warnings } = collectConsole(page)

  const res = await page.goto('/trace.html', { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(200)

  await expect(page.locator('.trace-page')).toBeVisible()
  await page.waitForTimeout(3000)

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
  expect(warnings.filter((w) => /\[Vue warn\]|Uncaught|TypeError|ReferenceError/.test(w)), warnings.join('\n')).toEqual([])
})
