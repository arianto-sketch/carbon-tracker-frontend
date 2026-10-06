import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

test.describe('riwayat entri', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('HIS')
  let projectId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id

    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id
    const payload = { emission_factor_id: factorId, quantity: 5, entry_date: `${new Date().getFullYear()}-01-20` }
    const entryId = (await (await pmApi.post(`projects/${projectId}/entries`, { data: payload })).json()).data.id
    await pmApi.put(`projects/${projectId}/entries/${entryId}`, { data: { ...payload, quantity: 7 } })
    await pmApi.post(`projects/${projectId}/entries/${entryId}/submit`)
    await pmApi.dispose()
  })

  test('menampilkan kronologi perubahan beserta pelaku', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('row').filter({ hasText: '7 ' }).getByRole('button', { name: 'Riwayat entri' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Riwayat Entri')).toBeVisible()
    await expect(dialog.getByText('Dibuat')).toBeVisible()
    await expect(dialog.getByText('Diubah')).toBeVisible()
    await expect(dialog.getByText('Di-submit')).toBeVisible()
    await expect(dialog.getByText(/Jumlah: 5\s*→\s*7/)).toBeVisible()
    await expect(dialog.getByText(/oleh /).first()).toContainText('oleh ')
    await expect(dialog.getByText('oleh Sistem')).toHaveCount(0)
  })
})
