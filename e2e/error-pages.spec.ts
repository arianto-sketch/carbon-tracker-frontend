import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

test.describe('halaman error & empty state', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('ERR')
  let foreignProjectId = 0
  let emptyProjectId = 0

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    // Project milik admin saja: PM bukan anggota
    foreignProjectId = (await (await adminApi.post('projects', { data: { name: `Asing ${code}`, code: `${code}-A`, start_date: '2026-01-01' } })).json()).data.id
    emptyProjectId = (await (await pmApi.post('projects', { data: { name: `Kosong ${code}`, code: `${code}-K`, start_date: '2026-01-01' } })).json()).data.id
    await Promise.all([adminApi.dispose(), pmApi.dispose()])
  })

  test('URL tidak dikenal menampilkan halaman 404', async ({ page }) => {
    await page.goto('/halaman-yang-tidak-ada')
    await expect(page).toHaveURL('/halaman-yang-tidak-ada')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()

    await page.getByRole('link', { name: 'Kembali ke Dashboard' }).click()
    await expect(page).toHaveURL('/')
  })

  test('halaman admin untuk non-admin menampilkan 403', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/403')
    await expect(page.getByText('Akses ditolak')).toBeVisible()
  })

  test('project milik orang lain menampilkan 403', async ({ page }) => {
    await page.goto(`/projects/${foreignProjectId}`)
    await expect(page).toHaveURL('/403')
    await expect(page.getByText('Akses ditolak')).toBeVisible()
  })

  test('project yang tidak ada menampilkan 404', async ({ page }) => {
    await page.goto('/projects/99999999')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
  })

  test('project baru menampilkan empty state entri dan target', async ({ page }) => {
    await page.goto(`/projects/${emptyProjectId}`)
    await expect(page.getByText('Belum ada entri')).toBeVisible()

    await page.getByRole('tab', { name: 'Target' }).click()
    await expect(page.getByText('Belum ada target')).toBeVisible()
  })
})
