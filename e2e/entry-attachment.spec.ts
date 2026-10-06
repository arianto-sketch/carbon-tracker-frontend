import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

const pdf = { name: 'struk.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% bukti e2e\n') }
const txt = { name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan pdf') }

test.describe.serial('lampiran bukti entri', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('ATT')
  let projectId = 0
  let entryId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id
    entryId = (await (await pmApi.post(`projects/${projectId}/entries`, {
      data: { emission_factor_id: factorId, quantity: 44, entry_date: `${new Date().getFullYear()}-01-25` },
    })).json()).data.id
    await pmApi.dispose()
  })

  test('menolak tipe file yang tidak diizinkan', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await expect(page.getByText('Belum ada lampiran.')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(txt)
    await page.getByRole('button', { name: 'Unggah' }).click()
    await expect(page.getByText('Lampiran harus berupa PDF, JPG, atau PNG.')).toBeVisible()
  })

  test('mengunggah lalu mengunduh lampiran', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await page.locator('input[type="file"]').setInputFiles(pdf)
    await page.getByRole('button', { name: 'Unggah' }).click()

    await expect(page.getByText('Lampiran berhasil diunggah.')).toBeVisible()
    await expect(page.getByText('struk.pdf')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Unduh' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('struk.pdf')
  })

  test('lampiran bisa diunduh dari tabel entri', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Unduh lampiran struk.pdf' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('struk.pdf')
  })

  test('menghapus lampiran', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await page.getByRole('button', { name: 'Hapus' }).click()

    await expect(page.getByText('Lampiran dihapus.')).toBeVisible()
    await expect(page.getByText('Belum ada lampiran.')).toBeVisible()
  })
})
