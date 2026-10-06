import { test, expect, type Page } from '@playwright/test'
import { USERS, field, pickSelect, uniqueCode } from './helpers'

// Alur utama: project → entri → submit → approve (admin) → target & progress → edit target.
test.describe.serial('alur carbon tracking', () => {
  const code = uniqueCode('E2E')
  const year = new Date().getFullYear()
  let projectUrl = ''
  let pm: Page

  test.beforeAll(async ({ browser }) => {
    pm = await (await browser.newContext({ storageState: USERS.pm.state })).newPage()
  })

  test.afterAll(async () => {
    await pm.context().close()
  })

  test('PM membuat project baru', async () => {
    await pm.goto('/projects')
    await pm.getByRole('button', { name: 'Project Baru' }).click()
    await field(pm, 'Nama Project').fill(`Project ${code}`)
    await field(pm, 'Kode').fill(code)
    await field(pm, 'Tanggal Mulai').fill(`${year}-01-01`)
    await pm.getByRole('button', { name: 'Simpan' }).click()

    await pm.getByText(`Project ${code}`).click()
    await expect(pm).toHaveURL(/\/projects\/\d+$/)
    projectUrl = new URL(pm.url()).pathname
  })

  test('kode project duplikat menampilkan pesan per field', async () => {
    await pm.goto('/projects')
    await pm.getByRole('button', { name: 'Project Baru' }).click()
    await field(pm, 'Nama Project').fill('Duplikat')
    await field(pm, 'Kode').fill(code)
    await field(pm, 'Tanggal Mulai').fill(`${year}-01-01`)
    await pm.getByRole('button', { name: 'Simpan' }).click()

    await expect(pm.getByText('Kode project sudah digunakan.')).toBeVisible()
  })

  test('PM mencatat entri lalu submit', async () => {
    await pm.goto(`${projectUrl}/entries/new`)
    await pickSelect(pm, 'Kategori')
    await pickSelect(pm, 'Faktor Emisi')
    await field(pm, 'Jumlah').fill('100')
    await field(pm, 'Tanggal Aktivitas').fill(`${year}-01-15`)
    await pm.getByRole('button', { name: 'Simpan' }).click()
    await expect(pm).toHaveURL(projectUrl)

    await pm.locator('button:has(.mdi-send)').first().click()
    await expect(pm.locator('button:has(.mdi-send)')).toHaveCount(0)
  })

  test('admin meng-approve entri', async ({ browser }) => {
    const admin = await (await browser.newContext({ storageState: USERS.admin.state })).newPage()
    await admin.goto(projectUrl)
    await admin.locator('button:has(.mdi-check)').first().click()
    await expect(admin.getByText('Entry berhasil di-approve.')).toBeVisible()
    await admin.context().close()
  })

  test('target tahunan menampilkan progress dari entri approved', async () => {
    await pm.goto(`${projectUrl}/targets/new`)
    await pickSelect(pm, 'Tipe Periode', 'Tahunan')
    await field(pm, 'Target Emisi (kg CO₂e)').fill('1000')
    await pm.getByRole('button', { name: 'Simpan' }).click()
    await expect(pm).toHaveURL(projectUrl)

    await pm.getByRole('tab', { name: 'Target' }).click()
    // v-card juga merender progress-linear loader (aria-hidden) — ambil yang bernilai saja
    const bar = pm.locator('.v-window-item--active .v-progress-linear[aria-valuenow]').first()
    await expect(bar).toHaveAttribute('aria-valuenow', /^(?!0$)\d+(\.\d+)?$/)
  })

  test('halaman edit target terisi data yang ada', async () => {
    await pm.goto(projectUrl)
    await pm.getByRole('tab', { name: 'Target' }).click()
    await pm.getByRole('link', { name: 'Edit target' }).first().click()

    await expect(pm.getByRole('heading', { name: 'Edit Target Emisi' })).toBeVisible()
    await expect(field(pm, 'Target Emisi (kg CO₂e)')).toHaveValue('1000')
  })
})
