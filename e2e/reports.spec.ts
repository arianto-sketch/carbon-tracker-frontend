import { test, expect } from '@playwright/test'
import { statSync } from 'node:fs'
import { USERS } from './helpers'

test.use({ storageState: USERS.pm.state })

test('generate laporan lalu download file xlsx', async ({ page }) => {
  await page.goto('/reports')
  await page.getByRole('button', { name: /generate laporan/i }).click()
  await expect(page.getByText('Laporan siap!')).toBeVisible({ timeout: 30_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  expect(statSync(await download.path()).size).toBeGreaterThan(0)
})
