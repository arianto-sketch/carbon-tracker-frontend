import { test, expect } from '@playwright/test'
import { USERS } from './helpers'

test.describe('aksesibilitas', () => {
  test.use({ storageState: USERS.pm.state })

  test('bahasa halaman Indonesia dan judul tab mengikuti halaman', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page).toHaveTitle('Dashboard · Carbon Tracker')

    await page.goto('/projects')
    await expect(page).toHaveTitle('Projects · Carbon Tracker')
  })

  test('halaman 404 punya heading utama yang langsung difokus', async ({ page }) => {
    await page.goto('/halaman-yang-tidak-ada')

    const heading = page.getByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(page).toHaveTitle('Halaman tidak ditemukan · Carbon Tracker')
  })

  test('halaman 403 punya heading utama yang langsung difokus', async ({ page }) => {
    await page.goto('/403')

    const heading = page.getByRole('heading', { level: 1, name: 'Akses ditolak' })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await expect(page).toHaveTitle('Akses ditolak · Carbon Tracker')
  })
})
