import { expect, request, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api/v1'

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

const pageOf = (scope: Page | Locator): Page =>
  'page' in scope && typeof scope.page === 'function' ? scope.page() : (scope as Page)

/** v-field Vuetify berdasarkan teks label; scope bisa halaman atau area (mis. dialog).
 *  Locator `has` dievaluasi relatif ke .v-field, jadi harus dibangun dari page, bukan dari scope. */
const vField = (scope: Page | Locator, label: string) =>
  scope.locator('.v-field').filter({ has: pageOf(scope).locator(`label:text-is("${label}")`) }).first()

/** Input di dalam v-field Vuetify berdasarkan teks label. */
export const field = (scope: Page | Locator, label: string) => vField(scope, label).locator('input, textarea').first()

/** Pilih opsi pada v-select Vuetify; tanpa `option` memilih opsi pertama. */
export async function pickSelect(scope: Page | Locator, label: string, option?: string) {
  const page = pageOf(scope)
  const select = vField(scope, label)
  await expect(select).not.toHaveClass(/v-field--disabled/) // mis. Faktor Emisi menunggu Kategori dipilih
  await select.click()
  // role=option saja: saat item masih dimuat, Vuetify menampilkan list-item "No data available"
  const options = page.locator('.v-menu.v-overlay--active [role="option"]')
  await options.first().waitFor()
  await (option ? options.filter({ hasText: option }).first() : options.first()).click()
  await expect(page.locator('.v-menu.v-overlay--active')).toHaveCount(0) // tunggu menu selesai menutup (dialog juga v-overlay)
}

/** Token yang disimpan auth.setup di storageState (tidak menambah hitungan rate limit login). */
export function tokenFromState(statePath: string): string {
  const state = JSON.parse(readFileSync(statePath, 'utf8'))
  const token = state.origins.flatMap((o: any) => o.localStorage).find((i: any) => i.name === 'token')?.value
  if (!token) throw new Error(`Token tidak ditemukan di ${statePath}`)
  return token
}

/** Klien API ber-token untuk menyiapkan data uji. Pakai path relatif tanpa '/' di depan, mis. 'projects'. */
export function apiAs(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `${API_URL}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
}

export async function apiLogin(email: string, password: string): Promise<string> {
  const ctx = await request.newContext({ baseURL: `${API_URL}/`, extraHTTPHeaders: { Accept: 'application/json' } })
  const res = await ctx.post('auth/login', { data: { email, password } })
  expect(res.ok(), await res.text()).toBeTruthy()
  const token = (await res.json()).data.token
  await ctx.dispose()
  return token
}
