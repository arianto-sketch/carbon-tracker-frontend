import { test, expect } from '@playwright/test'
import { USERS } from './helpers'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type',
}

function notification(i: number) {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    data: { type: 'entry_approved', message: `Notifikasi uji ${i}`, project_id: null },
    read_at: null,
    created_at: new Date().toISOString(),
  }
}

test.describe('pagination notifikasi', () => {
  test.use({ storageState: USERS.pm.state })

  test('notifikasi lama dimuat lewat "Muat lebih banyak"', async ({ page }) => {
    // 22 notifikasi dalam 2 halaman (API menampilkan 20 per halaman)
    await page.route((url) => url.pathname.endsWith('/api/v1/notifications'), (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
      const current = Number(new URL(route.request().url()).searchParams.get('page') ?? 1)
      const ids = current === 1 ? Array.from({ length: 20 }, (_, i) => 22 - i) : [2, 1]
      return route.fulfill({
        status: 200,
        headers: CORS,
        contentType: 'application/json',
        body: JSON.stringify({
          data: ids.map(notification),
          meta: { current_page: current, last_page: 2, total: 22, unread_count: 22 },
        }),
      })
    })

    await page.goto('/projects')
    await page.getByRole('button', { name: 'Notifikasi' }).click()

    await expect(page.getByText('Notifikasi uji 3', { exact: true })).toBeVisible()
    await expect(page.getByText('Notifikasi uji 2', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Muat lebih banyak' }).click()

    await expect(page.getByText('Notifikasi uji 1', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Muat lebih banyak' })).toHaveCount(0)
  })
})
