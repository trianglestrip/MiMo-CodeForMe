import { test, expect } from '@playwright/test'

test('trace 模拟模式展示消息步骤', async ({ page }) => {
  const res = await page.goto('/trace.html?simulate=1', { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(200)

  await expect(page.locator('.trace-page')).toBeVisible()
  await expect(page.locator('.trace-turn')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.trace-step').first()).toBeVisible({ timeout: 15_000 })

  const stepCount = await page.locator('.trace-step').count()
  expect(stepCount).toBeGreaterThan(0)
})

test('trace 页加载后壳层可见', async ({ page }) => {
  await page.goto('/trace.html', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.trace-page')).toBeVisible()
  await expect(page.locator('.trace-sidebar, .trace-sk-sidebar').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.timeline-main, .trace-sk-timeline').first()).toBeVisible({ timeout: 10_000 })
})
