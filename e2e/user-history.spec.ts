import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState } from './helpers'

test.describe('riwayat user (admin)', () => {
  test.use({ storageState: USERS.admin.state })

  const stamp = `riwayat-${Date.now()}`
  const emailA = `${stamp}-a@example.test`
  const emailB = `${stamp}-b@example.test`
  let userA: number
  let adminName: string

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    adminName = (await (await adminApi.get('auth/me')).json()).data.name
    const create = async (name: string, email: string) => {
      const res = await adminApi.post('users', {
        data: { name, email, password: 'rahasia123', password_confirmation: 'rahasia123', role: 'pm' },
      })
      expect(res.ok(), await res.text()).toBeTruthy()
      return (await res.json()).data.id as number
    }
    userA = await create('User Riwayat A', emailA)
    await create('User Riwayat B', emailB)
    const update = await adminApi.put(`users/${userA}`, { data: { role: 'viewer', is_active: false } })
    expect(update.ok(), await update.text()).toBeTruthy()
    await adminApi.dispose()
  })

  const historyButton = (page: import('@playwright/test').Page, email: string) =>
    page.getByRole('row').filter({ hasText: email }).getByRole('button', { name: 'Riwayat user' })

  test('admin melihat siapa mengubah role dan status user', async ({ page }) => {
    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(emailA)
    await historyButton(page, emailA).click()

    const dialog = page.getByRole('dialog', { name: 'Riwayat User Riwayat A' })
    await expect(dialog.getByText('Role: Project Manager → Viewer')).toBeVisible()
    await expect(dialog.getByText('Status: Aktif → Nonaktif')).toBeVisible()
    await expect(dialog.getByText(`Diubah oleh ${adminName}`)).toBeVisible()
    await expect(dialog.getByText(`Dibuat oleh ${adminName}`)).toBeVisible()
  })

  test('riwayat user sebelumnya yang terlambat dimuat tidak menimpa dialog user lain', async ({ page }) => {
    // Respons riwayat user A ditahan sampai dialog user B sudah tampil
    let releaseA!: () => void
    const heldA = new Promise<void>((resolve) => { releaseA = resolve })
    await page.route(`**/api/v1/users/${userA}/history`, async (route) => {
      const response = await route.fetch()
      await heldA
      await route.fulfill({ response })
    })

    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(stamp)
    await historyButton(page, emailA).click()
    await page.getByRole('button', { name: 'Tutup' }).click()
    await historyButton(page, emailB).click()

    const dialog = page.getByRole('dialog', { name: 'Riwayat User Riwayat B' })
    await expect(dialog.getByText(`Dibuat oleh ${adminName}`)).toBeVisible()

    const lateA = page.waitForResponse((res) => res.url().endsWith(`/users/${userA}/history`) && res.request().method() === 'GET')
    releaseA()
    await lateA
    await expect(dialog.getByText('Role: Project Manager → Viewer')).toHaveCount(0)
    await expect(dialog.getByText(`Dibuat oleh ${adminName}`)).toBeVisible()
  })
})
