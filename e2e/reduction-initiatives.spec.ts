import { test, expect } from '@playwright/test'
import { USERS, apiAs, field, pickSelect, tokenFromState, uniqueCode } from './helpers'
import { formatCo2 } from '../src/utils/formatters'
import { formatIntensity } from '../src/utils/initiatives'

// Rencana aksi reduksi per project dan intensitas emisi (emisi disetujui ÷ jumlah anggota tim).
test.describe.configure({ mode: 'serial' })
test.use({ storageState: USERS.pm.state })

const code = uniqueCode('RAK')
let projectId = 0

test.beforeAll(async () => {
  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  const adminApi = await apiAs(tokenFromState(USERS.admin.state))
  projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2024-01-01' } })).json()).data.id

  // Satu entri disetujui (oleh admin, bukan pembuatnya) supaya intensitas punya nilai
  const factorId = (await (await pmApi.get('emission-factors', { params: { search: 'Bensin', is_active: 1 } })).json()).data[0].id
  const entry = await pmApi.post(`projects/${projectId}/entries`, {
    data: { emission_factor_id: factorId, quantity: 100, entry_date: '2025-01-15' },
  })
  expect(entry.ok(), await entry.text()).toBeTruthy()
  const entryId = (await entry.json()).data.id
  await pmApi.post(`projects/${projectId}/entries/${entryId}/submit`)
  const approved = await adminApi.post(`projects/${projectId}/entries/${entryId}/approve`)
  expect(approved.ok(), await approved.text()).toBeTruthy()
  await Promise.all([pmApi.dispose(), adminApi.dispose()])
})

test('owner mengisi jumlah anggota tim dan intensitas emisi tampil di ringkasan', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  await page.getByRole('button', { name: 'Ubah project' }).click()
  const dialog = page.getByRole('dialog', { name: 'Ubah Project' })
  await expect(field(dialog, 'Nama Project')).toHaveValue(`Project ${code}`)
  await field(dialog, 'Jumlah anggota tim').fill('4')
  await dialog.getByRole('button', { name: 'Simpan' }).click()
  await expect(page.getByText('Project berhasil diperbarui.')).toBeVisible()

  const pmApi = await apiAs(tokenFromState(USERS.pm.state))
  const summary = (await (await pmApi.get(`projects/${projectId}/summary`)).json()).data
  await pmApi.dispose()
  expect(summary.team_size).toBe(4)

  await page.getByRole('tab', { name: 'Ringkasan' }).click()
  const intensity = page.getByRole('region', { name: 'Intensitas emisi' })
  await expect(intensity).toContainText(formatIntensity(summary.intensity_kg_per_person))
  await expect(intensity).toContainText('Total disetujui ÷ 4 anggota tim')
})

test('anggota mencatat inisiatif lalu menandainya selesai', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  await page.getByRole('tab', { name: 'Rencana Aksi' }).click()
  await expect(page.getByText('Belum ada rencana aksi')).toBeVisible()

  await page.getByRole('button', { name: 'Tambah Inisiatif' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tambah Inisiatif' })
  await field(dialog, 'Judul').fill('Ganti lampu kantor ke LED')
  await field(dialog, 'Estimasi reduksi (kg CO₂e/tahun)').fill('1200')
  await pickSelect(dialog, 'PIC')
  await field(dialog, 'Target tanggal').fill('2099-12-31')
  await dialog.getByRole('button', { name: 'Simpan' }).click()

  const row = page.getByRole('row').filter({ hasText: 'Ganti lampu kantor ke LED' })
  await expect(row).toContainText('Direncanakan')
  await expect(row).toContainText(formatCo2(1200))
  await expect(page.getByRole('group', { name: 'Potensi reduksi' })).toContainText(formatCo2(1200))
  await expect(page.getByRole('group', { name: 'Reduksi tercapai' })).toContainText(formatCo2(0))

  await row.getByRole('button', { name: 'Ubah Ganti lampu kantor ke LED' }).click()
  const edit = page.getByRole('dialog', { name: 'Ubah Inisiatif' })
  await expect(field(edit, 'Judul')).toHaveValue('Ganti lampu kantor ke LED')
  await pickSelect(edit, 'Status', 'Selesai')
  await edit.getByRole('button', { name: 'Simpan' }).click()

  await expect(row).toContainText('Selesai')
  await expect(page.getByRole('group', { name: 'Potensi reduksi' })).toContainText(formatCo2(0))
  await expect(page.getByRole('group', { name: 'Reduksi tercapai' })).toContainText(formatCo2(1200))
})

test('owner menghapus inisiatif setelah konfirmasi', async ({ page }) => {
  await page.goto(`/projects/${projectId}`)
  await page.getByRole('tab', { name: 'Rencana Aksi' }).click()
  await page.getByRole('button', { name: 'Hapus Ganti lampu kantor ke LED' }).click()
  await page.getByRole('dialog', { name: 'Hapus inisiatif?' }).getByRole('button', { name: 'Hapus' }).click()

  await expect(page.getByText('Inisiatif berhasil dihapus.')).toBeVisible()
  await expect(page.getByText('Belum ada rencana aksi')).toBeVisible()
})

test('dashboard menampilkan ringkasan rencana aksi', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Rencana aksi reduksi' })
  await expect(card).toContainText('Potensi reduksi per tahun')
  await expect(card).toContainText('inisiatif selesai')
})
