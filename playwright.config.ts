import { defineConfig, devices } from '@playwright/test'

/**
 * E2E butuh backend Laravel yang sudah berjalan (default http://127.0.0.1:8000, override via E2E_API_URL)
 * dengan data seed (php artisan migrate --seed) dan queue worker aktif / QUEUE_CONNECTION=sync
 * agar laporan selesai dibuat. Dev server Vite dijalankan otomatis bila belum hidup.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // semua spec berbagi satu database backend
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
