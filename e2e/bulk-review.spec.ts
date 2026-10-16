import { test, expect, type APIRequestContext } from '@playwright/test'
import { USERS, apiAs, apiLogin, field, tokenFromState, uniqueCode } from './helpers'
import { isoDate, localToday, suggestCopyDate } from '../src/utils/dates'
import { formatDate } from '../src/utils/formatters'

// Tanggal entri uji selalu di masa lalu, berapa pun tanggal hari ini: tanggal 10, dua bulan lalu
// (jadi saran salinan, sebulan setelahnya, juga belum melewati hari ini)
const base = new Date()
base.setDate(10)
base.setMonth(base.getMonth() - 2)
const entryDate = isoDate(base)

// Owner me-review banyak entri sekaligus; entri bisa disalin (mis. tagihan rutin bulanan).
test.describe.configure({ mode: 'serial' })
test.use({ storageState: USERS.pm.state })

const code = uniqueCode('BLK')
const memberEmail = `member.${code.toLowerCase()}@example.test`
const password = 'Password123!'
let projectId = 0
let factorId = 0
let memberApi: APIRequestContext

async function submitted(quantity: number): Promise<number> {
  const entry = await memberApi.post(`projects/${projectId}/entries`, {
    data: { emission_factor_id: factorId, quantity, entry_date: entryDate },
  })
  expect(entry.ok(), await entry.text()).toBeTruthy()
  const id = (await entry.json()).data.id
  expect((await memberApi.post(`projects/${projectId}/entries/${id}/submit`)).ok()).toBeTruthy()
  return id
}

test.beforeAll(async () => {
  const adminApi = await apiAs(tokenFromState(USERS.admin.state))
  const reg = await adminApi.post('users', {
    data: { name: `Anggota ${code}`, email: memberEmail, password, password_confirmation: password, role: 'pm' },
  })
  expect(reg.ok(), await reg.text()).toBeTruthy()
  const memberId = (await reg.json()).data.id
  await adminApi.dispose()

  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2024-01-01' } })).json()).data.id
  await pmApi.post(`projects/${projectId}/members`, { data: { user_id: memberId, role: 'member' } })
  await pmApi.dispose()

  memberApi = await apiAs(await apiLogin(memberEmail, password))
  factorId = (await (await memberApi.get('emission-factors', { params: { search: 'Bensin', is_active: 1 } })).json()).data[0].id
  for (const quantity of [41, 42, 43]) await submitted(quantity)
})

test.afterAll(async () => {
  await memberApi?.dispose()
})

const row = (page: import('@playwright/test').Page, quantity: number) =>
  // \b: "41 liter" tidak ikut cocok dengan "141 liter" (teks sel dalam satu baris tergabung tanpa spasi)
  page.getByRole('row').filter({ hasText: new RegExp(`\\b${quantity} liter`) })

test('owner menyetujui semua entri yang dipilih sekaligus', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  await page.getByRole('checkbox', { name: 'Pilih semua entri yang bisa di-review' }).check()
  await expect(page.getByText('3 entri dipilih')).toBeVisible()

  await page.getByRole('button', { name: 'Setujui terpilih' }).click()
  await expect(page.getByText('3 entri disetujui.')).toBeVisible()
  for (const quantity of [41, 42, 43]) await expect(row(page, quantity)).toContainText('Disetujui')
})

test('owner menolak entri terpilih dengan satu alasan', async ({ page }) => {
  await submitted(51)
  await submitted(52)
  await page.goto(`/projects/${projectId}`)

  for (const quantity of [51, 52]) await row(page, quantity).getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Tolak terpilih' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tolak 2 entri' })
  await dialog.getByLabel('Alasan penolakan').fill('Lampirkan struk untuk setiap entri.')
  await dialog.getByRole('button', { name: 'Tolak' }).click()

  await expect(page.getByText('2 entri ditolak.')).toBeVisible()
  await expect(row(page, 51)).toContainText('Alasan: Lampirkan struk untuk setiap entri.')
})

// 'Pilih semua' di sini mengandalkan test sebelumnya: entri 41-43 sudah disetujui, 51-52 ditolak
test('entri yang sudah berubah status dilewati dan alasannya ditampilkan', async ({ page }) => {
  const stale = await submitted(61)
  await submitted(62)
  await page.goto(`/projects/${projectId}`)
  await page.getByRole('checkbox', { name: 'Pilih semua entri yang bisa di-review' }).check()

  // Admin sudah meng-approve satu entri sebelum owner menekan tombol
  const adminApi = await apiAs(tokenFromState(USERS.admin.state))
  expect((await adminApi.post(`projects/${projectId}/entries/${stale}/approve`)).ok()).toBeTruthy()
  await adminApi.dispose()

  await page.getByRole('button', { name: 'Setujui terpilih' }).click()
  await expect(page.getByText('1 entri disetujui, 1 dilewati.')).toBeVisible()
  const skipped = page.getByRole('alert').filter({ hasText: '1 entri dilewati' })
  await expect(skipped).toContainText('61 liter')
  await expect(skipped).toContainText('submitted')
})

test('menyalin entri: form terisi, tanggal disarankan bulan berikutnya', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  await row(page, 41).getByRole('link', { name: 'Salin entri' }).click()

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/entries/new\\?copyFrom=\\d+`))
  await expect(page.getByText(`Disalin dari entri ${formatDate(entryDate)}`)).toBeVisible()
  await expect(field(page, 'Jumlah')).toHaveValue('41')
  await expect(field(page, 'Tanggal Aktivitas')).toHaveValue(suggestCopyDate(entryDate, localToday()))

  await field(page, 'Jumlah').fill('45')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`))
  await expect(row(page, 45)).toContainText('Draft')
})
