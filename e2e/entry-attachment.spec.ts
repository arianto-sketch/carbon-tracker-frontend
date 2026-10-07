import { test, expect, type Page } from '@playwright/test'
import { API_URL, USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

const PDF = Buffer.from('%PDF-1.4\n% bukti e2e\n')
const pdf = { name: 'struk.pdf', mimeType: 'application/pdf', buffer: PDF }
const txt = { name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan pdf') }

test.describe.serial('lampiran bukti entri', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('ATT')
  let projectId = 0
  let entryId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id
    entryId = (await (await pmApi.post(`projects/${projectId}/entries`, {
      data: { emission_factor_id: factorId, quantity: 44, entry_date: `${new Date().getFullYear()}-01-25` },
    })).json()).data.id
    await pmApi.dispose()
  })

  test('menolak tipe file yang tidak diizinkan', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await expect(page.getByText('Belum ada lampiran.')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(txt)
    await page.getByRole('button', { name: 'Unggah' }).click()
    await expect(page.getByText('Lampiran harus berupa PDF, JPG, atau PNG.')).toBeVisible()
  })

  test('mengunggah lalu mengunduh lampiran', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await page.locator('input[type="file"]').setInputFiles(pdf)
    await page.getByRole('button', { name: 'Unggah' }).click()

    await expect(page.getByText('Lampiran berhasil diunggah.')).toBeVisible()
    await expect(page.getByText('struk.pdf')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Unduh' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('struk.pdf')
  })

  test('lampiran bisa diunduh dari tabel entri', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Unduh lampiran struk.pdf' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('struk.pdf')
  })

  test('menghapus lampiran', async ({ page }) => {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await page.getByRole('button', { name: 'Hapus' }).click()

    await expect(page.getByText('Lampiran dihapus.')).toBeVisible()
    await expect(page.getByText('Belum ada lampiran.')).toBeVisible()
  })
})

// Nama file unduhan tidak boleh memercayai ekstensi dari pengunggah, apa pun isi header dari server
test.describe('nama file unduhan lampiran', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('DLN')
  let projectId = 0
  let entryId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    projectId = (await (await pmApi.post('projects', { data: { name: `Project ${code}`, code, start_date: '2026-01-01' } })).json()).data.id
    const factorId = (await (await pmApi.get('emission-factors')).json()).data[0].id
    entryId = (await (await pmApi.post(`projects/${projectId}/entries`, {
      data: { emission_factor_id: factorId, quantity: 12, entry_date: `${new Date().getFullYear()}-01-26` },
    })).json()).data.id
    // Isi PDF valid, tapi nama dari pengunggah berekstensi .bat
    const upload = await pmApi.post(`projects/${projectId}/entries/${entryId}/attachment`, {
      multipart: { file: { name: 'struk.bat', mimeType: 'application/pdf', buffer: PDF } },
    })
    expect(upload.ok(), await upload.text()).toBeTruthy()
    await pmApi.dispose()
  })

  /** Ganti respons unduhan lampiran dengan header tertentu (termasuk preflight CORS). */
  async function serveAttachment(page: Page, headers: Record<string, string>) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Disposition',
    }
    await page.route(`${API_URL}/projects/${projectId}/entries/${entryId}/attachment`, (route) => {
      const method = route.request().method()
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      if (method !== 'GET') return route.continue()
      return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/pdf', ...headers }, body: PDF })
    })
  }

  async function downloadFromForm(page: Page) {
    await page.goto(`/projects/${projectId}/entries/${entryId}/edit`)
    await expect(page.getByText('struk.bat')).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Unduh' }).click()])
    return download.suggestedFilename()
  }

  test('PDF bernama .bat terunduh sebagai .pdf', async ({ page }) => {
    expect(await downloadFromForm(page)).toBe('struk.pdf')
  })

  test('"filename*=" di dalam nama ber-kutip tidak mengecoh parser', async ({ page }) => {
    await serveAttachment(page, { 'Content-Disposition': `attachment; filename="filename*=utf-8''evil.bat;.pdf"` })

    const name = await downloadFromForm(page)
    expect(name).not.toBe('evil.bat')
    expect(name).toMatch(/\.pdf$/)
  })

  test('tanpa header Content-Disposition, ekstensi mengikuti tipe file', async ({ page }) => {
    await serveAttachment(page, {})

    expect(await downloadFromForm(page)).toBe('struk.pdf')
  })

  test('filename* (UTF-8) diutamakan daripada filename', async ({ page }) => {
    await serveAttachment(page, { 'Content-Disposition': `attachment; filename="Struk Cafe.pdf"; filename*=utf-8''Struk%20Caf%C3%A9.pdf` })

    expect(await downloadFromForm(page)).toBe('Struk Café.pdf')
  })
})
