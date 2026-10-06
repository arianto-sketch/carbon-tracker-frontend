import { test, expect, type APIRequestContext } from '@playwright/test'
import { USERS, apiAs, apiLogin, login, tokenFromState, uniqueCode } from './helpers'

// Hak akses entri: viewer hanya membaca; owner meng-approve entri anggota tapi tidak entri buatan sendiri.
test.describe.serial('hak akses project', () => {
  const code = uniqueCode('ACL')
  const password = 'Password123!'
  const viewerEmail = `viewer.${code.toLowerCase()}@example.com`
  const memberEmail = `member.${code.toLowerCase()}@example.com`
  let projectId = 0
  let pmApi: APIRequestContext

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    pmApi = await apiAs(tokenFromState(USERS.pm.state))

    const users: Record<string, number> = {}
    for (const [key, email] of [['viewer', viewerEmail], ['member', memberEmail]]) {
      const res = await adminApi.post('auth/register', {
        data: { name: `E2E ${key}`, email, password, password_confirmation: password, role: 'pm' },
      })
      expect(res.ok(), await res.text()).toBeTruthy()
      users[key] = (await res.json()).data.id
    }

    const project = await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })
    projectId = (await project.json()).data.id
    await pmApi.post(`projects/${projectId}/members`, { data: { user_id: users.viewer, role: 'viewer' } })
    await pmApi.post(`projects/${projectId}/members`, { data: { user_id: users.member, role: 'member' } })

    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id
    const year = new Date().getFullYear()
    const memberApi = await apiAs(await apiLogin(memberEmail, password))
    for (const [client, quantity] of [[memberApi, 11], [pmApi, 22]] as const) {
      const entry = await client.post(`projects/${projectId}/entries`, {
        data: { emission_factor_id: factorId, quantity, entry_date: `${year}-01-10` },
      })
      const entryId = (await entry.json()).data.id
      await client.post(`projects/${projectId}/entries/${entryId}/submit`)
    }
    await memberApi.dispose()
    await adminApi.dispose()
  })

  test.afterAll(async () => {
    await pmApi.dispose()
  })

  test('viewer hanya bisa melihat entri tanpa tombol tulis', async ({ page }) => {
    await page.goto('/login')
    await login(page, viewerEmail, password)
    await expect(page).toHaveURL('/') // tunggu token tersimpan sebelum pindah halaman
    await page.goto(`/projects/${projectId}`)

    await expect(page.getByRole('row').filter({ hasText: '11 ' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tambah Entri' })).toHaveCount(0)
    await expect(page.locator('button:has(.mdi-send), button:has(.mdi-check), a:has(.mdi-pencil)')).toHaveCount(0)
  })

  test.describe('owner', () => {
    test.use({ storageState: USERS.pm.state })

    test('bisa approve entri anggota tapi tidak entri buatan sendiri', async ({ page }) => {
      await page.goto(`/projects/${projectId}`)
      const ownRow = page.getByRole('row').filter({ hasText: '22 ' })
      const memberRow = page.getByRole('row').filter({ hasText: '11 ' })

      await expect(ownRow).toBeVisible()
      await expect(ownRow.locator('button:has(.mdi-check)')).toHaveCount(0)

      await memberRow.locator('button:has(.mdi-check)').click()
      await expect(page.getByText('Entry berhasil di-approve.')).toBeVisible()
      await expect(memberRow.getByText('Disetujui')).toBeVisible()
    })
  })
})
