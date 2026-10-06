import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

test.describe('import entri dari CSV', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('IMP')
  const year = new Date().getFullYear()
  let projectId = 0
  let factorSlug = ''

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    factorSlug = (await (await pmApi.get('emission-factors')).json()).data[0].slug
    await pmApi.dispose()
  })

  test('unduh template, pratinjau dengan error per baris, simpan baris valid', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('button', { name: 'Import' }).click()
    const dialog = page.getByRole('dialog')

    const [template] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Unduh Template' }).click(),
    ])
    expect(template.suggestedFilename()).toBe('template-import-entri.xlsx')

    const csv = [
      'tanggal,kode_faktor,jumlah,keterangan,vendor,tipe_aktivitas',
      `${year}-01-05,${factorSlug},12,Import A,,`,
      `${year}-01-06,${factorSlug},13,Import B,Pertamina,`,
      `${year}-01-07,kode_salah,14,,,`,
    ].join('\n')
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    await dialog.getByRole('button', { name: 'Pratinjau' }).click()

    await expect(dialog.getByText('2 baris valid, 1 baris bermasalah (tidak ikut disimpan).')).toBeVisible()
    await expect(dialog.getByText(/Kode faktor tidak dikenal/)).toBeVisible()

    await dialog.getByRole('button', { name: 'Simpan 2 baris valid' }).click()
    await expect(page.getByText('2 entri berhasil diimport sebagai draft.')).toBeVisible()

    for (const qty of ['12 ', '13 ']) {
      await expect(page.getByRole('row').filter({ hasText: qty }).getByText('Draft')).toBeVisible()
    }
    await expect(page.getByRole('row').filter({ hasText: '14 ' })).toHaveCount(0)
  })
})
