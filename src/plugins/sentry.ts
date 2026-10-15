import type { App } from 'vue'

/**
 * Pelaporan error ke Sentry, hanya bila VITE_SENTRY_DSN diisi saat build. SDK dimuat dinamis,
 * jadi tanpa DSN tidak ada kode Sentry yang ikut diunduh browser.
 */
export async function initSentry(app: App, dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN): Promise<boolean> {
  if (!dsn) return false

  const Sentry = await import('@sentry/vue')
  Sentry.init({
    app,
    dsn,
    environment: import.meta.env.MODE,
    // Data user, cookie, header, body request, dan query string tidak dikirim (token API ada di header)
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  })
  return true
}
