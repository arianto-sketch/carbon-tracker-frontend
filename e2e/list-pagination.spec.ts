import { test, expect } from '@playwright/test'
import { USERS, apiAs, field, tokenFromState, uniqueCode } from './helpers'

test.describe('pagination & pencarian list', () => {
  test.use({ storageState: USERS.pm.state })

  const prefix = uniqueCode('PGN')
  let entryUrl = ''
  let factorName = ''

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    // >15 project supaya list project pasti punya halaman kedua
    let lastProjectId = 0
    for (let i = 1; i <= 16; i++) {
      const code = `${prefix}-${String(i).padStart(2, '0')}`
      const res = await pmApi.post('projects', { data: { name: `Paging ${code}`, code, start_date: '2026-01-01' } })
      expect(res.ok(), await res.text()).toBeTruthy()
      lastProjectId = (await res.json()).data.id
    }

    const factor = (await (await pmApi.get('emission-factors')).json()).data[0]
    factorName = factor.name
    const entry = await pmApi.post(`projects/${lastProjectId}/entries`, {
      data: { emission_factor_id: factor.id, quantity: 9, entry_date: `${new Date().getFullYear()}-02-01` },
    })
    entryUrl = `/projects/${lastProjectId}/entries/${(await entry.json()).data.id}/edit`
    await pmApi.dispose()
  })

  test('pindah halaman tersimpan di URL', async ({ page }) => {
    await page.goto('/projects')
    const firstPageTitles = await page.locator('h3').allTextContents()

    await page.getByRole('navigation').getByRole('button', { name: /halaman 2|page 2|^2$/i }).click()
    await expect(page).toHaveURL(/\/projects\?page=2$/)
    await expect(page.getByText(/Halaman 2 dari \d+/)).toBeVisible()
    expect(await page.locator('h3').allTextContents()).not.toEqual(firstPageTitles)

    await page.reload()
    await expect(page.getByText(/Halaman 2 dari \d+/)).toBeVisible()
  })

  test('pencarian project berjalan di server, bukan hanya di halaman aktif', async ({ page }) => {
    await page.goto('/projects')
    await page.getByPlaceholder('Cari project...').fill(`${prefix}-16`)

    await expect(page.locator('h3')).toHaveCount(1)
    await expect(page.locator('h3')).toHaveText(`Paging ${prefix}-16`)
  })

  test('form edit entri mempertahankan faktor emisi yang tersimpan', async ({ page }) => {
    await page.goto(entryUrl)
    await expect(page.getByRole('heading', { name: 'Edit Entri Emisi' })).toBeVisible()
    await expect(field(page, 'Jumlah')).toHaveValue('9')

    const factorField = page.locator('.v-field').filter({ has: page.locator('label:text-is("Faktor Emisi")') }).first()
    await expect(factorField).toContainText(factorName)

    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Entri berhasil diperbarui.')).toBeVisible()
  })
})
