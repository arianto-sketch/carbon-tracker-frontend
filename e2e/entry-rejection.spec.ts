import { test, expect } from '@playwright/test'
import { USERS, apiAs, apiLogin, login, tokenFromState, uniqueCode } from './helpers'

// Owner menolak entri anggota dengan alasan; anggota melihat alasan lalu submit ulang.
test.describe.serial('tolak & revisi entri', () => {
  const code = uniqueCode('REJ')
  const memberEmail = `member.${code.toLowerCase()}@example.com`
  const password = 'Password123!'
  const reason = 'Jumlah liter tidak sesuai struk, mohon dicek ulang.'
  let projectId = 0

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))

    const reg = await adminApi.post('users', {
      data: { name: 'E2E Member', email: memberEmail, password, password_confirmation: password, role: 'pm' },
    })
    expect(reg.ok(), await reg.text()).toBeTruthy()
    const memberId = (await reg.json()).data.id

    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    await pmApi.post(`projects/${projectId}/members`, { data: { user_id: memberId, role: 'member' } })

    const memberApi = await apiAs(await apiLogin(memberEmail, password))
    const factorId = (await (await memberApi.get('emission-factors')).json()).data[0].id
    const entry = await memberApi.post(`projects/${projectId}/entries`, {
      data: { emission_factor_id: factorId, quantity: 33, entry_date: `${new Date().getFullYear()}-01-12` },
    })
    await memberApi.post(`projects/${projectId}/entries/${(await entry.json()).data.id}/submit`)

    await Promise.all([adminApi.dispose(), pmApi.dispose(), memberApi.dispose()])
  })

  test.describe('owner', () => {
    test.use({ storageState: USERS.pm.state })

    test('menolak entri dengan alasan wajib', async ({ page }) => {
      await page.goto(`/projects/${projectId}`)
      const row = page.getByRole('row').filter({ hasText: '33 ' })
      await row.getByRole('button', { name: 'Tolak entri' }).click()

      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: 'Tolak' }).click()
      await expect(dialog.getByText('Alasan wajib diisi')).toBeVisible()

      await dialog.getByLabel('Alasan penolakan').fill(reason)
      await dialog.getByRole('button', { name: 'Tolak' }).click()

      await expect(page.getByText('Entri ditolak dan dikembalikan ke pembuat.')).toBeVisible()
      await expect(row.getByText('Ditolak')).toBeVisible()
      await expect(row.getByText(`Alasan: ${reason}`)).toBeVisible()
    })
  })

  test('pembuat melihat alasan lalu submit ulang', async ({ page }) => {
    await page.goto('/login')
    await login(page, memberEmail, password)
    await expect(page).toHaveURL('/')
    await page.goto(`/projects/${projectId}`)

    const row = page.getByRole('row').filter({ hasText: '33 ' })
    await expect(row.getByText(`Alasan: ${reason}`)).toBeVisible()
    await expect(row.locator('a:has(.mdi-pencil)')).toBeVisible()

    await row.locator('button:has(.mdi-send)').click()
    await expect(row.getByText('Menunggu Approval')).toBeVisible()
    await expect(row.getByText(`Alasan: ${reason}`)).toHaveCount(0)
  })
})
