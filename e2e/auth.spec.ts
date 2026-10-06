import { test, expect } from '@playwright/test'
import { USERS, login } from './helpers'

test('tamu diarahkan ke login lalu kembali ke halaman tujuan', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)projects$/)

  await login(page, USERS.pm.email, USERS.pm.password)
  await expect(page).toHaveURL('/projects')
})

test.describe('admin', () => {
  test.use({ storageState: USERS.admin.state })

  test('hard refresh di halaman admin tetap di halaman tersebut', async ({ page }) => {
    await page.goto('/admin/emission-factors')
    await expect(page).toHaveURL('/admin/emission-factors')
    await expect(page.getByRole('heading', { name: 'Emission Factors' })).toBeVisible()
  })
})

test.describe('non-admin', () => {
  test.use({ storageState: USERS.pm.state })

  test('tidak bisa membuka halaman admin', async ({ page }) => {
    await page.goto('/admin/emission-factors')
    await expect(page).toHaveURL('/')
  })
})
