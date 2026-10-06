import { expect, type Page } from '@playwright/test'

export const USERS = {
  pm: {
    email: process.env.E2E_PM_EMAIL ?? 'arianto@logique.co.id',
    password: process.env.E2E_PM_PASSWORD ?? 'password',
    state: 'e2e/.auth/pm.json',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@logique.co.id',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password',
    state: 'e2e/.auth/admin.json',
  },
}

/** Kode unik per run supaya spec bisa dijalankan berulang pada database yang sama. */
export const uniqueCode = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`

export async function login(page: Page, email: string, password: string) {
  await page.locator('input[type="email"], input').first().fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
}

/** Input di dalam v-field Vuetify berdasarkan teks label. */
export const field = (page: Page, label: string) =>
  page.locator('.v-field').filter({ has: page.locator(`label:text-is("${label}")`) }).locator('input, textarea').first()

/** Pilih opsi pada v-select Vuetify; tanpa `option` memilih opsi pertama. */
export async function pickSelect(page: Page, label: string, option?: string) {
  const select = page.locator('.v-field').filter({ has: page.locator(`label:text-is("${label}")`) }).first()
  await expect(select).not.toHaveClass(/v-field--disabled/) // mis. Faktor Emisi menunggu Kategori dipilih
  await select.click()
  // role=option saja: saat item masih dimuat, Vuetify menampilkan list-item "No data available"
  const options = page.locator('.v-overlay--active [role="option"]')
  await options.first().waitFor()
  await (option ? options.filter({ hasText: option }).first() : options.first()).click()
  await expect(page.locator('.v-overlay--active')).toHaveCount(0) // tunggu menu selesai menutup
}
