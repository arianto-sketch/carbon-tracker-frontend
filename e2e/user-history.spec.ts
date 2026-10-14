import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState } from './helpers'

test.describe('riwayat user (admin)', () => {
  test.use({ storageState: USERS.admin.state })

  const email = `riwayat-${Date.now()}@example.test`

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const res = await adminApi.post('users', {
      data: { name: 'User Riwayat', email, password: 'rahasia123', password_confirmation: 'rahasia123', role: 'pm' },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const userId = (await res.json()).data.id
    await adminApi.put(`users/${userId}`, { data: { role: 'viewer', is_active: false } })
    await adminApi.dispose()
  })

  test('admin melihat siapa mengubah role dan status user', async ({ page }) => {
    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(email)
    const row = page.getByRole('row').filter({ hasText: email })
    await row.getByRole('button', { name: 'Riwayat user' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Role: Project Manager → Viewer')).toBeVisible()
    await expect(dialog.getByText('Status: Aktif → Nonaktif')).toBeVisible()
    await expect(dialog.getByText('Diubah oleh Admin Logique')).toBeVisible()
    await expect(dialog.getByText('Dibuat oleh Admin Logique')).toBeVisible()
  })
})
