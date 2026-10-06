import { test, expect } from '@playwright/test'
import { API_URL, USERS, field, pickSelect, uniqueCode } from './helpers'

test.describe.serial('manajemen user (admin)', () => {
  test.use({ storageState: USERS.admin.state })

  const tag = uniqueCode('usr').toLowerCase()
  const email = `${tag}@example.com`
  const password = 'Password123!'

  test('admin menambah user baru', async ({ page }) => {
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Tambah User' }).click()

    const dialog = page.getByRole('dialog')
    await field(dialog, 'Nama').fill(`User ${tag}`)
    await field(dialog, 'Email').fill(email)
    await field(dialog, 'Password').fill(password)
    await field(dialog, 'Konfirmasi Password').fill(password)
    await pickSelect(dialog, 'Role', 'Project Manager')
    await dialog.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('User ditambahkan.')).toBeVisible()
    await page.getByPlaceholder('Cari nama atau email...').fill(tag)
    await expect(page.getByRole('row').filter({ hasText: email })).toBeVisible()
  })

  test('admin mengubah role dan menonaktifkan user, lalu user tidak bisa login', async ({ page, request }) => {
    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(tag)
    const row = page.getByRole('row').filter({ hasText: email })
    await row.getByRole('button', { name: 'Edit user' }).click()

    const dialog = page.getByRole('dialog')
    await pickSelect(dialog, 'Role', 'Viewer')
    await dialog.getByLabel('Akun aktif').uncheck()
    await dialog.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('User diperbarui.')).toBeVisible()
    await expect(row.getByText('Viewer')).toBeVisible()
    await expect(row.getByText('Nonaktif')).toBeVisible()

    const login = await request.post(`${API_URL}/auth/login`, {
      headers: { Accept: 'application/json' },
      data: { email, password },
    })
    expect(login.status()).toBe(422)
    expect(await login.text()).toContain('tidak aktif')
  })

  test('admin tidak bisa menonaktifkan akunnya sendiri dari UI', async ({ page }) => {
    await page.goto('/admin/users')
    await page.getByPlaceholder('Cari nama atau email...').fill(USERS.admin.email)
    await page.getByRole('row').filter({ hasText: '(Anda)' }).getByRole('button', { name: 'Edit user' }).click()

    await expect(page.getByRole('dialog').getByLabel('Akun aktif')).toBeDisabled()
  })
})

test.describe('non-admin', () => {
  test.use({ storageState: USERS.pm.state })

  test('tidak bisa membuka halaman users', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/')
  })
})
