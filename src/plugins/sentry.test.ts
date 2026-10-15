import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/vue', () => ({ init: vi.fn() }))

import * as Sentry from '@sentry/vue'
import { initSentry } from './sentry'

const app = {} as any

describe('initSentry', () => {
  beforeEach(() => vi.mocked(Sentry.init).mockClear())

  it('tidak aktif tanpa DSN', async () => {
    expect(await initSentry(app, '')).toBe(false)
    expect(await initSentry(app, undefined)).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('aktif dengan DSN tanpa mengirim data pribadi', async () => {
    expect(await initSentry(app, 'https://public@sentry.example.test/1')).toBe(true)
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      app,
      dsn: 'https://public@sentry.example.test/1',
      dataCollection: expect.objectContaining({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] }),
    }))
  })
})
