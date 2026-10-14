import { test, expect, type Page } from '@playwright/test'
import { USERS, apiAs, field, pickSelect, tokenFromState, uniqueCode } from './helpers'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type',
}

/** Ganti respons satu endpoint dashboard dengan data tetap (angka bisa dipastikan di layar) */
async function mockDashboard(page: Page, endpoint: string, data: unknown) {
  await page.route((url) => url.pathname.endsWith(`/api/v1/dashboard/${endpoint}`), (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ data }) }))
}

test.describe('scope GHG faktor emisi (admin)', () => {
  test.use({ storageState: USERS.admin.state })

  const name = `Zz Faktor Uji ${uniqueCode('GHG')}`

  test.afterAll(async () => {
    // Faktor uji dinonaktifkan supaya tidak muncul di form entri spec lain
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const res = await adminApi.get('emission-factors', { params: { search: name } })
    for (const f of (await res.json()).data) await adminApi.delete(`emission-factors/${f.id}`)
    await adminApi.dispose()
  })

  test('admin menentukan scope GHG saat menambah faktor emisi', async ({ page }) => {
    await page.goto('/admin/emission-factors')
    await expect(page.getByRole('row').filter({ hasText: 'Listrik PLN Jawa-Bali' })).toContainText('Scope 2')

    await page.getByRole('button', { name: 'Tambah Faktor' }).click()
    const dialog = page.getByRole('dialog')
    await pickSelect(dialog, 'Kategori', 'Supply Chain / Vendor')
    await field(dialog, 'Nama').fill(name)
    await field(dialog, 'Slug').fill(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
    await field(dialog, 'Satuan Input').fill('kg')
    await field(dialog, 'Nilai Faktor').fill('2.98')
    await pickSelect(dialog, 'Scope GHG', 'Scope 1')
    await dialog.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Faktor emisi ditambahkan.')).toBeVisible()

    await page.getByPlaceholder('Cari faktor emisi...').fill(name)
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Scope 1')
  })
})

test.describe('pelaporan (pm)', () => {
  test.use({ storageState: USERS.pm.state })

  // Bila test toggle gagal di tengah, email pm dinyalakan lagi supaya run berikutnya tidak ikut gagal
  test.afterAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    const me = (await (await pmApi.get('auth/me')).json()).data
    if (!me.email_notifications) await pmApi.put('auth/me', { data: { name: me.name, email_notifications: true } })
    await pmApi.dispose()
  })

  test('form entri menampilkan scope faktor yang dipilih', async ({ page }) => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    const project = (await (await pmApi.get('projects')).json()).data.find((p: any) => p.current_user_role)
    await pmApi.dispose()

    await page.goto(`/projects/${project.id}/entries/new`)
    await pickSelect(page, 'Kategori', 'Konsumsi Energi')
    await pickSelect(page, 'Faktor Emisi', 'Listrik PLN Jawa-Bali')
    await expect(page.getByText('Scope 2 · Energi yang dibeli')).toBeVisible()
  })

  test('dashboard menampilkan proyeksi akhir tahun, perbandingan tahun lalu, dan scope GHG', async ({ page }) => {
    await mockDashboard(page, 'outlook', {
      year: 2026, months_elapsed: 4, ytd_co2e_kg: 924, projected_annual_co2e_kg: 2772,
      previous_year: { year: 2025, same_period_co2e_kg: 231, full_year_co2e_kg: 1155 }, yoy_change_pct: 300,
    })
    await mockDashboard(page, 'scope-breakdown', [
      { scope: 1, label: 'Scope 1', total_co2e_kg: 231, entry_count: 1, percentage: 46.95 },
      { scope: 2, label: 'Scope 2', total_co2e_kg: 261, entry_count: 1, percentage: 53.05 },
      { scope: 3, label: 'Scope 3', total_co2e_kg: 0, entry_count: 0, percentage: 0 },
    ])

    await page.goto('/')
    const outlook = page.getByRole('region', { name: 'Proyeksi & perbandingan' })
    await expect(outlook.getByText('2.77 ton CO₂e')).toBeVisible()
    await expect(outlook.getByText('Proyeksi akhir 2026 (run-rate 4 bulan)')).toBeVisible()
    await expect(outlook.getByText('+300,0% vs Jan–Apr 2025')).toBeVisible()

    const scopes = page.getByRole('region', { name: 'Scope GHG' })
    await expect(scopes.getByText('Scope 2 · Energi yang dibeli')).toBeVisible()
    await expect(scopes.getByText('261.00 kg CO₂e · 53,05%')).toBeVisible()
  })

  test('ringkasan siap cetak memuat seluruh bagian dan menyembunyikan navigasi saat dicetak', async ({ page }) => {
    await page.goto('/reports')
    await page.getByRole('link', { name: 'Ringkasan siap cetak' }).click()
    await expect(page).toHaveURL(/\/reports\/summary/)

    const year = new Date().getFullYear()
    await expect(page.getByRole('heading', { level: 1, name: `Ringkasan Emisi ${year}` })).toBeVisible()
    for (const section of ['Scope GHG', 'Per kategori', 'Tren bulanan', 'Per project', 'Entri emisi terbesar']) {
      await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible()
    }
    const scopeTable = page.getByRole('table', { name: 'Emisi per scope GHG' })
    await expect(scopeTable.getByRole('row')).toHaveCount(5) // header + 3 scope + total

    await page.evaluate(() => { (window as any).__printed = false; window.print = () => { (window as any).__printed = true } })
    await page.getByRole('button', { name: 'Cetak / Simpan PDF' }).click()
    expect(await page.evaluate(() => (window as any).__printed)).toBe(true)

    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.v-navigation-drawer')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Cetak / Simpan PDF' })).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: `Ringkasan Emisi ${year}` })).toBeVisible()
  })

  test('gaya cetak ringkasan tidak berlaku di halaman lain', async ({ page }) => {
    await page.goto('/reports/summary')
    await expect(page.getByRole('heading', { level: 2, name: 'Scope GHG' })).toBeVisible()
    await page.getByRole('link', { name: 'Kembali' }).click()
    await expect(page).toHaveURL(/\/reports$/)

    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.v-navigation-drawer')).toBeVisible()
  })

  test('bagian yang gagal dimuat ditandai di ringkasan, bukan dicetak sebagai nol', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/api/v1/dashboard/scope-breakdown'), (route) => route.abort())
    await page.goto('/reports/summary')

    const warning = page.getByRole('alert').filter({ hasText: 'Sebagian data gagal dimuat' })
    await expect(warning).toContainText('Scope GHG')
    await page.emulateMedia({ media: 'print' })
    await expect(warning).toBeVisible()
  })

  test('ringkasan mengabaikan tahun yang tidak masuk akal di URL', async ({ page }) => {
    await page.goto('/reports/summary?year=99999')
    await expect(page.getByRole('heading', { level: 1, name: `Ringkasan Emisi ${new Date().getFullYear()}` })).toBeVisible()
  })

  test('ringkasan mengikuti tahun dari URL', async ({ page }) => {
    const year = new Date().getFullYear() - 1
    await page.goto(`/reports/summary?year=${year}`)
    await expect(page.getByRole('heading', { level: 1, name: `Ringkasan Emisi ${year}` })).toBeVisible()
  })

  test('user mematikan dan menyalakan lagi notifikasi email dari Profil', async ({ page }) => {
    await page.goto('/profile')
    const toggle = page.getByRole('checkbox', { name: 'Kirim notifikasi email' })
    await expect(toggle).toBeChecked()

    await toggle.click()
    await expect(page.getByText('Notifikasi email dimatikan.')).toBeVisible()
    await page.reload()
    await expect(toggle).not.toBeChecked()

    await toggle.click()
    await expect(page.getByText('Notifikasi email dinyalakan.')).toBeVisible()
    await page.reload()
    await expect(toggle).toBeChecked()
  })
})
