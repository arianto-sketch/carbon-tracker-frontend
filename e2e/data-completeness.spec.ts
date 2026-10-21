import { test, expect } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

// Kelengkapan data bulanan: faktor rutin yang belum dicatat bulan lalu ditandai, bisa ditandai
// "tidak ada data", dan muncul di dashboard (isi yang sama dengan pengingat tanggal 5 dan 10).
test.describe.configure({ mode: 'serial' })
test.use({ storageState: USERS.pm.state })

const code = uniqueCode('KLP')
const projectName = `Kelengkapan ${code}`
let projectId = 0
let monthLabel = ''

/** "YYYY-MM" dikurangi n bulan, tanggal 10 (format YYYY-MM-DD) */
function tenthOf(period: string, monthsBack: number): string {
  const [year, month] = period.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(year, month - 1 - monthsBack, 10))
  return d.toISOString().slice(0, 10)
}

test.beforeAll(async () => {
  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  projectId = (await (await pmApi.post('projects', { data: { name: projectName, code, start_date: '2024-01-01' } })).json()).data.id

  // Bulan terakhir yang lengkap menurut server (zona waktu bisnis), bukan jam runner
  const period = (await (await pmApi.get('dashboard/data-completeness')).json()).data.period as string
  const factorId = async (search: string) =>
    (await (await pmApi.get('emission-factors', { params: { search, is_active: 1 } })).json()).data[0].id
  const electricity = await factorId('Listrik PLN Jawa-Bali')
  const gasoline = await factorId('Bensin')

  // Listrik tercatat 2 bulan sebelumnya (rutin) tapi kosong bulan lalu; bensin ada bulan lalu (project tidak kosong)
  for (const [emission_factor_id, entry_date] of [[electricity, tenthOf(period, 2)], [electricity, tenthOf(period, 1)], [gasoline, tenthOf(period, 0)]]) {
    const res = await pmApi.post(`projects/${projectId}/entries`, { data: { emission_factor_id, quantity: 100, entry_date } })
    expect(res.ok(), await res.text()).toBeTruthy()
  }

  const grid = (await (await pmApi.get(`projects/${projectId}/data-completeness`)).json()).data
  monthLabel = grid.months[grid.months.length - 1].label
  await pmApi.dispose()
})

test('bulan lalu yang belum lengkap diperingatkan dan bisa ditandai tidak ada data', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  const alert = page.getByRole('alert').filter({ hasText: `Data ${monthLabel} belum lengkap` })
  await expect(alert).toContainText('belum ada Listrik PLN Jawa-Bali')

  await alert.getByRole('button', { name: 'Lihat kelengkapan' }).click()
  // Tabel kelengkapan saja (tabel entri di tab lain juga memuat nama faktor)
  const panel = page.getByRole('table', { name: /Kelengkapan data/ })
  const row = panel.getByRole('row').filter({ hasText: 'Listrik PLN Jawa-Bali' })
  await expect(row).toContainText('Belum diisi')
  await expect(panel.getByRole('row').filter({ hasText: 'Bensin' })).toContainText('Draft')

  await row.getByRole('button', { name: `Tandai Listrik PLN Jawa-Bali ${monthLabel} tidak ada data` }).click()
  await expect(page.getByText(`Ditandai tidak ada data ${monthLabel}.`)).toBeVisible()
  await expect(row).toContainText('Tidak ada data')
  await expect(row).not.toContainText('Belum diisi')

  // Peringatan di tab Entri ikut hilang
  await page.getByRole('tab', { name: 'Entri Emisi' }).click()
  await expect(page.getByRole('alert').filter({ hasText: `Data ${monthLabel} belum lengkap` })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Kelengkapan' }).click()
  await row.getByRole('button', { name: `Batalkan tanda Listrik PLN Jawa-Bali ${monthLabel}` }).click()
  await expect(row).toContainText('Belum diisi')
})

test('dashboard menampilkan project yang datanya belum lengkap', async ({ page }) => {
  // Database dipakai bersama antar-run: posisi project ini dibandingkan dengan isi API
  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  const summary = (await (await pmApi.get('dashboard/data-completeness')).json()).data
  await pmApi.dispose()
  const position = summary.incomplete.findIndex((p: any) => p.id === projectId)
  expect(position).toBeGreaterThanOrEqual(0)

  await page.goto('/')
  const card = page.getByRole('region', { name: `Kelengkapan data ${summary.period_label}` })
  // Dashboard memuat 10 endpoint sekaligus; di server lokal single-thread kartu ini bisa muncul paling akhir
  await expect(card).toBeVisible({ timeout: 20_000 })
  if (position < 5) {
    await expect(card.getByRole('link').filter({ hasText: projectName })).toContainText('belum ada Listrik PLN Jawa-Bali')
  } else {
    await expect(card).toContainText(`Dan ${summary.incomplete.length - 5} project lainnya belum lengkap.`)
  }
})
