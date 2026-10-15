import { test, expect } from '@playwright/test'
import { USERS, apiAs, pickSelect, tokenFromState, uniqueCode } from './helpers'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type',
}

test.describe('lupa password', () => {
  test('dari halaman login, user meminta link reset', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Lupa password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)

    await page.getByLabel('Email').fill(`tidak-ada-${Date.now()}@example.test`)
    await page.getByRole('button', { name: 'Kirim link reset' }).click()
    await expect(page.getByText('Jika email terdaftar dan aktif, link reset password sudah dikirim.')).toBeVisible()
  })

  test('link reset yang tidak valid ditolak', async ({ page }) => {
    await page.goto('/reset-password#token=palsu&email=budi%40example.test')
    await expect(page.getByLabel('Email')).toHaveValue('budi@example.test')
    await page.getByLabel('Password baru', { exact: true }).fill('baru-sekali-123')
    await page.getByLabel('Ulangi password baru').fill('baru-sekali-123')
    await page.getByRole('button', { name: 'Simpan password baru' }).click()
    await expect(page.getByText('Link reset password tidak valid atau sudah kedaluwarsa.')).toBeVisible()
  })

  test('setelah password direset, user diarahkan ke login', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/api/v1/auth/reset-password'), (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: CORS })
        : route.fulfill({ status: 200, headers: CORS, contentType: 'application/json',
          body: JSON.stringify({ message: 'Password berhasil direset. Silakan login dengan password baru.' }) }))

    await page.goto('/reset-password#token=abc&email=budi%40example.test')
    await page.getByLabel('Password baru', { exact: true }).fill('baru-sekali-123')
    await page.getByLabel('Ulangi password baru').fill('baru-sekali-123')
    await page.getByRole('button', { name: 'Simpan password baru' }).click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Password berhasil direset. Silakan login dengan password baru.')).toBeVisible()
  })

  test('link tanpa token mengarahkan ke permintaan link baru', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('Link reset tidak lengkap')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Minta link baru' })).toHaveAttribute('href', '/forgot-password')
  })
})

test.describe('admin mengirim link reset', () => {
  test.use({ storageState: USERS.admin.state })

  test('admin mengirim link reset dan tercatat di riwayat user', async ({ page }) => {
    const email = `reset-${Date.now()}@example.test`
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    const adminName = (await (await adminApi.get('auth/me')).json()).data.name
    const res = await adminApi.post('users', {
      data: { name: 'User Reset', email, password: 'rahasia123', password_confirmation: 'rahasia123', role: 'pm' },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    await adminApi.dispose()

    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(email)
    const row = page.getByRole('row').filter({ hasText: email })
    await row.getByRole('button', { name: 'Kirim link reset password User Reset' }).click()
    await expect(page.getByText(`Link reset password dikirim ke ${email}.`)).toBeVisible()

    await row.getByRole('button', { name: 'Riwayat user User Reset' }).click()
    await expect(page.getByRole('dialog').getByText(`Link reset password dikirim oleh ${adminName}`)).toBeVisible()
  })
})

test.describe('kelola anggota project (owner)', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('MBR')
  const names = { member: `Anggota ${code}`, viewer: `Pengamat ${code}` }
  let projectId = 0

  test.beforeAll(async () => {
    const adminApi = await apiAs(tokenFromState(USERS.admin.state))
    for (const [key, role] of [['member', 'pm'], ['viewer', 'viewer']] as const) {
      const res = await adminApi.post('users', {
        data: { name: names[key], email: `${key}.${code.toLowerCase()}@example.test`, password: 'rahasia123', password_confirmation: 'rahasia123', role },
      })
      expect(res.ok(), await res.text()).toBeTruthy()
    }
    await adminApi.dispose()

    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    await pmApi.dispose()
  })

  test('owner menambah, mengubah role, dan menghapus anggota', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('tab', { name: 'Anggota' }).click()

    await page.getByRole('button', { name: 'Tambah anggota' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Cari user').fill(code)
    await page.getByRole('option', { name: new RegExp(names.member) }).click()
    await pickSelect(dialog, 'Role di project', 'Member')
    await dialog.getByRole('button', { name: 'Tambahkan' }).click()

    const memberRow = page.getByRole('listitem').filter({ hasText: names.member })
    await expect(memberRow).toContainText('Member')

    await pickSelect(memberRow, 'Role', 'Owner')
    await expect(page.getByText(`Role ${names.member} diubah menjadi Owner.`)).toBeVisible()
    await pickSelect(memberRow, 'Role', 'Member')
    await expect(page.getByText(`Role ${names.member} diubah menjadi Member.`)).toBeVisible()

    await memberRow.getByRole('button', { name: `Keluarkan ${names.member}` }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Keluarkan' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: names.member })).toHaveCount(0)
  })

  test('user ber-role Viewer hanya bisa dijadikan viewer project', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('tab', { name: 'Anggota' }).click()
    await page.getByRole('button', { name: 'Tambah anggota' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Cari user').fill(code)
    await page.getByRole('option', { name: new RegExp(names.viewer) }).click()

    await expect(dialog.getByText('User ber-role Viewer hanya bisa menjadi viewer di project.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Tambahkan' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: names.viewer })).toContainText('Viewer')
  })
})
