import { test, expect, type Page } from '@playwright/test'
import { USERS, apiAs, tokenFromState, uniqueCode } from './helpers'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type',
}

function setVisibility(page: Page, hidden: boolean) {
  return page.evaluate((isHidden) => {
    Object.defineProperty(document, 'visibilityState', { value: isHidden ? 'hidden' : 'visible', configurable: true })
    Object.defineProperty(document, 'hidden', { value: isHidden, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

test.describe('ketahanan UI', () => {
  test.use({ storageState: USERS.pm.state })

  const code = uniqueCode('UX')
  let projectId = 0

  test.beforeAll(async () => {
    const pmApi = await apiAs(tokenFromState(USERS.pm.state))
    for (const suffix of ['ALPHA', 'BETA']) {
      const res = await pmApi.post('projects', { data: { name: `${code} ${suffix}`, code: `${code}-${suffix[0]}`, start_date: '2026-01-01' } })
      projectId = (await res.json()).data.id
    }
    await pmApi.dispose()
  })

  test('dashboard tetap tampil walau satu endpoint gagal', async ({ page }) => {
    await page.route('**/api/v1/dashboard/target-alerts', (route) => route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{"message":"gagal"}' }))

    await page.goto('/')

    await expect(page.getByText(/Dari [1-9]\d* project/)).toBeVisible()
    await expect(page.getByText('Sebagian data dashboard gagal dimuat.')).toBeVisible()
  })

  test('halaman di luar jangkauan dikembalikan ke halaman terakhir', async ({ page }) => {
    await page.goto('/projects?page=999')

    await expect(page).not.toHaveURL(/page=999/)
    await expect(page.locator('.v-card[href^="/projects/"]').first()).toBeVisible()
  })

  test('respons pencarian yang terlambat tidak menimpa hasil terbaru', async ({ page }) => {
    // Permintaan pencarian ALPHA sengaja diperlambat sampai setelah BETA selesai
    await page.route((url) => url.pathname.endsWith('/api/v1/projects') && (url.searchParams.get('search') ?? '').includes('ALPHA'),
      async (route) => { await new Promise((r) => setTimeout(r, 2000)); await route.continue() })

    await page.goto('/projects')
    const search = page.getByPlaceholder('Cari project...')
    await search.fill(`${code} ALPHA`)
    await page.waitForTimeout(600) // debounce 300 ms lewat, permintaan ALPHA sedang berjalan
    await search.fill(`${code} BETA`)

    await expect(page.getByText(`${code} BETA`)).toBeVisible()
    await page.waitForTimeout(2500) // respons ALPHA datang terlambat
    await expect(page.getByText(`${code} BETA`)).toBeVisible()
    await expect(page.getByText(`${code} ALPHA`)).toHaveCount(0)
  })

  test('polling notifikasi berhenti saat tab tersembunyi dan memuat ulang saat kembali', async ({ page }) => {
    await page.clock.install()
    const calls: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'GET' && new URL(r.url()).pathname.endsWith('/api/v1/notifications')) calls.push(r.url())
    })

    await page.goto('/projects')
    await expect(page.getByPlaceholder('Cari project...')).toBeVisible()
    await expect.poll(() => calls.length).toBeGreaterThan(0)
    await page.waitForTimeout(500)
    const before = calls.length

    await setVisibility(page, true)
    await page.clock.runFor(3 * 60_000) // tiga kali interval polling
    await page.waitForTimeout(500)
    expect(calls.length).toBe(before)

    await setVisibility(page, false)
    await expect.poll(() => calls.length).toBe(before + 1)
  })

  test.describe('layout mobile 390px', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    // Satu test per halaman supaya tiap test singkat dan kegagalan menunjuk halaman yang tepat
    for (const [label, path] of [['dashboard', () => '/'], ['daftar project', () => '/projects'],
      ['detail project', () => `/projects/${projectId}`], ['laporan', () => '/reports']] as const) {
      test(`tanpa scroll horizontal di ${label}`, async ({ page }) => {
        await page.goto(path())
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow).toBeLessThanOrEqual(0)
      })
    }

    test('menu dibuka lewat tombol dan tertutup setelah memilih halaman', async ({ page }) => {
      await page.goto('/')
      const drawer = page.locator('nav.v-navigation-drawer')
      await expect(drawer).not.toHaveClass(/v-navigation-drawer--active/)

      await page.getByRole('button', { name: 'Buka menu' }).click()
      await expect(drawer).toHaveClass(/v-navigation-drawer--active/)
      await page.getByRole('link', { name: 'Projects' }).click()

      await expect(page).toHaveURL(/\/projects$/)
      await expect(drawer).not.toHaveClass(/v-navigation-drawer--active/)
    })
  })
})
