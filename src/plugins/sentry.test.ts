import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { App } from 'vue'

vi.mock('@sentry/vue', () => ({ init: vi.fn() }))

import * as Sentry from '@sentry/vue'
import { initSentry } from './sentry'

const app = {} as App

describe('initSentry', () => {
  beforeEach(() => vi.mocked(Sentry.init).mockClear())

  it('tidak aktif tanpa DSN', async () => {
    expect(await initSentry(app, '')).toBe(false)
    expect(await initSentry(app, undefined)).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('aktif dengan DSN tanpa mengirim data pribadi', async () => {
    expect(await initSentry(app, 'https://public@sentry.example.test/1')).toBe(true)

    const options = vi.mocked(Sentry.init).mock.calls[0]![0]!
    expect(options.app).toBe(app)
    expect(options.dsn).toBe('https://public@sentry.example.test/1')
    // Dikunci persis: menambah/melonggarkan pengumpulan data harus disengaja
    expect(options.dataCollection).toEqual({
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
    })
    // Props komponen (bisa berisi data user/emisi) tidak dilampirkan ke error
    expect(options.attachProps).toBe(false)
  })
})
