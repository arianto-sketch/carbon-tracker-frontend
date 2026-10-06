import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

test.describe('peringatan target di dashboard', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('ALR')
  const year = new Date().getFullYear()
  const warningProject = `Waspada ${code}`
  const exceededProject = `Lewat ${code}`
  let exceededId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id

    // Pemakaian ~90% (warning) dan ~125% (exceeded); entri di-approve admin (bukan pembuat)
    for (const [name, suffix, ratio] of [[warningProject, 'W', 0.9], [exceededProject, 'X', 1.25]] as const) {
      const projectId = (await (await pmApi.post('projects', { data: { name, code: `${code}-${suffix}`, start_date: '2026-01-01' } })).json()).data.id
      const entryId = (await (await pmApi.post(`projects/${projectId}/entries`, {
        data: { emission_factor_id: factorId, quantity: 100, entry_date: `${year}-01-15` },
      })).json()).data.id
      await pmApi.post(`projects/${projectId}/entries/${entryId}/submit`)
      const approved = await adminApi.post(`projects/${projectId}/entries/${entryId}/approve`)
      expect(approved.ok(), await approved.text()).toBeTruthy()

      const actual = (await approved.json()).data.co2e_kg
      await pmApi.post(`projects/${projectId}/targets`, {
        data: { period_type: 'yearly', period_year: year, target_co2e_kg: +(actual / ratio).toFixed(4) },
      })
      if (suffix === 'X') exceededId = projectId
    }
    await Promise.all([pmApi.dispose(), adminApi.dispose()])
  })

  test('menampilkan target ≥80% dengan level dan tautan ke project', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(`Peringatan Target ${year}`)).toBeVisible()

    const exceeded = page.getByRole('link').filter({ hasText: exceededProject })
    await expect(exceeded).toContainText('125.0%')
    await expect(exceeded).toContainText('melebihi target')
    await expect(page.getByRole('link').filter({ hasText: warningProject })).toContainText('90.0%')

    await exceeded.click()
    await expect(page).toHaveURL(`/projects/${exceededId}`)
  })
})
