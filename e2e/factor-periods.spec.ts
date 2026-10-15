import { test, expect } from '@playwright/test'
import { USERS, apiAs, field, pickSelect, tokenFromState, uniqueCode } from './helpers'

// Nilai faktor per periode: entri memakai nilai yang berlaku pada tanggal aktivitasnya.
// Test admin dan pm memakai faktor yang sama dan berjalan berurutan (serial).
test.describe.configure({ mode: 'serial' })

const code = uniqueCode('FP')
const factorName = `Zz Faktor Periode ${code}`
let factorId = 0
let projectId = 0

/** Emisi draft uji (10 kg x nilai faktor yang berlaku 1 Maret 2025), dibaca langsung dari API */
async function draftCo2e(): Promise<number> {
  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  const entries = (await (await pmApi.get(`projects/${projectId}/entries`)).json()).data
  await pmApi.dispose()
  return entries[0].co2e_kg
}

test.beforeAll(async () => {
  const adminApi = await apiAs(tokenFromState(USERS.admin.state))
  const categories = (await (await adminApi.get('emission-categories')).json()).data
  const vendor = categories.find((c: any) => c.slug === 'vendor')
  const factor = await adminApi.post('emission-factors', {
    data: { category_id: vendor.id, name: factorName, slug: code.toLowerCase(), source_unit: 'kg', factor_value: 2 },
  })
  expect(factor.ok(), await factor.text()).toBeTruthy()
  factorId = (await factor.json()).data.id
  await adminApi.dispose()

  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2024-01-01' } })).json()).data.id
  // Draft Maret 2025 dengan nilai awal (2 kg CO2e per kg)
  const entry = await pmApi.post(`projects/${projectId}/entries`, { data: { emission_factor_id: factorId, entry_date: '2025-03-01', quantity: 10 } })
  expect(entry.ok(), await entry.text()).toBeTruthy()
  await pmApi.dispose()
})

test.afterAll(async () => {
  // Faktor uji dinonaktifkan supaya tidak muncul di form entri spec lain
  if (!factorId) return
  const adminApi = await apiAs(tokenFromState(USERS.admin.state))
  await adminApi.delete(`emission-factors/${factorId}`)
  await adminApi.dispose()
})

test.describe('admin', () => {
  test.use({ storageState: USERS.admin.state })

  test('menambah dan menghapus nilai periode; draft ikut dihitung ulang', async ({ page }) => {
    await page.goto('/admin/emission-factors')
    await page.getByPlaceholder('Cari faktor emisi...').fill(factorName)
    await page.getByRole('row').filter({ hasText: factorName }).getByRole('button', { name: `Nilai per periode ${factorName}` }).click()

    const dialog = page.getByRole('dialog', { name: `Nilai ${factorName}` })
    const periods = dialog.getByRole('table', { name: 'Periode nilai faktor' })
    const firstRow = periods.getByRole('row').filter({ hasText: 'Sejak awal' })
    await expect(firstRow.getByRole('cell').nth(1)).toHaveText('2')

    await field(dialog, 'Berlaku mulai').fill('2025-01-01')
    await field(dialog, 'Nilai (kg CO₂e per kg)').fill('2.5')
    await field(dialog, 'Sumber').fill('Uji E2E')
    await dialog.getByRole('button', { name: 'Tambah periode' }).click()

    await expect(dialog.getByText('1 entri draft/ditolak dihitung ulang dengan nilai baru.')).toBeVisible()
    const newRow = periods.getByRole('row').filter({ hasText: '01 Jan 2025' })
    await expect(newRow.getByRole('cell').nth(1)).toHaveText('2,5')
    await expect(firstRow).toContainText('Sejak awal – 31 Des 2024')
    expect(await draftCo2e()).toBe(25)

    await newRow.getByRole('button', { name: 'Hapus periode mulai 01 Jan 2025' }).click()
    const confirm = page.getByRole('dialog', { name: 'Hapus periode?' })
    await expect(confirm).toContainText('Entri draft/ditolak pada periode ini akan dihitung ulang')
    await confirm.getByRole('button', { name: 'Hapus' }).click()

    await expect(periods.getByRole('row').filter({ hasText: '01 Jan 2025' })).toHaveCount(0)
    await expect(firstRow).toContainText('Sejak awal – sekarang')
    await expect.poll(draftCo2e).toBe(20)
  })
})

test.describe('pm', () => {
  test.use({ storageState: USERS.pm.state })

  test('estimasi emisi di form entri memakai nilai yang berlaku pada tanggal aktivitas', async ({ page }) => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const added = await adminApi.post(`emission-factors/${factorId}/values`, { data: { valid_from: '2026-01-01', factor_value: 3 } })
    expect(added.ok(), await added.text()).toBeTruthy()
    await adminApi.dispose()

    await page.goto(`/projects/${projectId}/entries/new`)
    await pickSelect(page, 'Kategori', 'Supply Chain / Vendor')
    await pickSelect(page, 'Faktor Emisi', factorName)
    await field(page, 'Jumlah').fill('10')

    await field(page, 'Tanggal Aktivitas').fill('2025-12-31')
    await expect(page.getByText('Estimasi emisi: 20.00 kg CO₂e')).toBeVisible()

    await field(page, 'Tanggal Aktivitas').fill('2026-01-02')
    await expect(page.getByText('Estimasi emisi: 30.00 kg CO₂e')).toBeVisible()
    await expect(page.getByText('Nilai faktor pada tanggal ini: 3 kg CO₂e per kg')).toBeVisible()
  })
})
