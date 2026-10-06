import { test, expect, type APIRequestContext } from '@playwright/test'
import { USERS, apiAs, apiLogin, login, tokenFromState, uniqueCode } from './helpers'

test.describe.serial('notifikasi approval', () => {
  const code = uniqueCode('NTF')
  const projectName = `Project ${code}`
  const memberName = `Anggota ${code}`
  const memberEmail = `member.${code.toLowerCase()}@example.com`
  const password = 'Password123!'
  const reason = 'Mohon lampirkan struk bensin.'
  let projectId = 0
  let entryId = 0
  let pmApi: APIRequestContext

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    pmApi = await apiAs(tokenFromState(USERS.pm.state))

    const reg = await adminApi.post('users', {
      data: { name: memberName, email: memberEmail, password, password_confirmation: password, role: 'pm' },
    })
    expect(reg.ok(), await reg.text()).toBeTruthy()

    projectId = (await (await pmApi.post('projects', { data: { name: projectName, code, start_date: '2026-01-01' } })).json()).data.id
    await pmApi.post(`projects/${projectId}/members`, { data: { user_id: (await reg.json()).data.id, role: 'member' } })

    const memberApi = await apiAs(await apiLogin(memberEmail, password))
    const factorId = (await (await memberApi.get('emission-factors')).json()).data[0].id
    entryId = (await (await memberApi.post(`projects/${projectId}/entries`, {
      data: { emission_factor_id: factorId, quantity: 55, entry_date: `${new Date().getFullYear()}-01-28` },
    })).json()).data.id
    await memberApi.post(`projects/${projectId}/entries/${entryId}/submit`)
    await Promise.all([adminApi.dispose(), memberApi.dispose()])
  })

  test.afterAll(async () => {
    await pmApi.dispose()
  })

  test.describe('owner', () => {
    test.use({ storageState: USERS.pm.state })

    test('menerima notifikasi submit dan membukanya ke halaman project', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Notifikasi' }).click()

      const item = page.getByText(`${memberName} mengirim entri untuk di-approve di project ${projectName}.`)
      await expect(item).toBeVisible()
      await item.click()
      await expect(page).toHaveURL(`/projects/${projectId}`)
    })
  })

  test('pembuat menerima notifikasi penolakan beserta alasan', async ({ page }) => {
    const res = await pmApi.post(`projects/${projectId}/entries/${entryId}/reject`, { data: { reason } })
    expect(res.ok(), await res.text()).toBeTruthy()

    await page.goto('/login')
    await login(page, memberEmail, password)
    await expect(page).toHaveURL('/')

    const bell = page.getByRole('button', { name: 'Notifikasi' })
    await expect(bell.locator('.v-badge__badge')).toHaveText('1')
    await bell.click()
    await expect(page.getByText(/menolak entri Anda di project/)).toBeVisible()
    await expect(page.getByText(`Alasan: ${reason}`)).toBeVisible()

    await page.getByRole('button', { name: 'Tandai semua dibaca' }).click()
    await expect(bell.locator('.v-badge__badge')).toBeHidden()
  })
})
