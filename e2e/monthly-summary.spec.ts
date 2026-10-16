import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState } from './helpers'

// Email ringkasan bulanan (owner project & admin) bisa dimatikan sendiri dari Profil.
test.describe('preferensi email ringkasan bulanan', () => {
  test.use({ storageState: USERS.pm.state })

  // Bila test gagal di tengah, preferensi pm dinyalakan lagi supaya run berikutnya tidak ikut gagal
  test.afterAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    const me = (await (await pmApi.get('auth/me')).json()).data
    if (!me.monthly_summary_email) {
      const restored = await pmApi.put('auth/me', { data: { name: me.name, monthly_summary_email: true } })
      expect(restored.ok(), await restored.text()).toBeTruthy()
    }
    await pmApi.dispose()
  })

  test('user mematikan dan menyalakan lagi email ringkasan bulanan', async ({ page }) => {
    await page.goto('/profile')
    const toggle = page.getByRole('checkbox', { name: 'Kirim email ringkasan bulanan' })
    const notifications = page.getByRole('checkbox', { name: 'Kirim notifikasi email' })
    await expect(toggle).toBeChecked()
    await expect(notifications).toBeChecked()

    await toggle.click()
    await expect(page.getByText('Email ringkasan bulanan dimatikan.')).toBeVisible()
    await page.reload()
    await expect(toggle).not.toBeChecked()
    // Preferensi lain tidak ikut berubah
    await expect(notifications).toBeChecked()

    await toggle.click()
    await expect(page.getByText('Email ringkasan bulanan dinyalakan.')).toBeVisible()
    await page.reload()
    await expect(toggle).toBeChecked()
  })
})
