import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/notifications.service', () => ({
  notificationsService: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}))

import { notificationsService } from '@/services/notifications.service'
import { useNotificationsStore } from './notifications.store'

const service = vi.mocked(notificationsService)

// Notifikasi bernomor: angka lebih besar = lebih baru (urutan API: terbaru dulu)
const n = (i: number, read = false) => ({ id: `n${i}`, read_at: read ? '2026-01-01T00:00:00Z' : null, data: {} })
const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, k) => n(from - k))
const pageOf = (data: any[], current: number, last: number, unread: number) =>
  ({ data, meta: { current_page: current, last_page: last, unread_count: unread } })
const ids = (items: any[]) => items.map(x => x.id)

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

describe('notifications store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('item yang tergeser dari halaman pertama tetap tampil setelah "muat lebih banyak"', async () => {
    const store = useNotificationsStore()
    service.list.mockResolvedValueOnce(pageOf(range(40, 21), 1, 2, 40))
    await store.fetch()
    service.list.mockResolvedValueOnce(pageOf(range(20, 1), 2, 2, 40))
    await store.loadMore()

    // Notifikasi baru (41) masuk: halaman pertama kini 41..22, item 21 tergeser keluar
    service.list.mockResolvedValueOnce(pageOf(range(41, 22), 1, 3, 41))
    await store.fetch()

    expect(ids(store.items)).toEqual(ids(range(41, 1)))
  })

  it('tidak menampilkan id ganda saat halaman berikutnya bergeser karena notifikasi baru', async () => {
    const store = useNotificationsStore()
    service.list.mockResolvedValueOnce(pageOf(range(50, 31), 1, 3, 0))
    await store.fetch()
    service.list.mockResolvedValueOnce(pageOf(range(30, 11), 2, 3, 0))
    await store.loadMore()
    // Dua notifikasi baru sebelum halaman 3 dimuat: halaman 3 diawali 12 dan 11 yang sudah tampil
    service.list.mockResolvedValueOnce(pageOf(range(12, 1), 3, 3, 0))
    await store.loadMore()

    expect(ids(store.items)).toEqual(ids(range(50, 1)))
  })

  it('tandai dibaca tetap berlaku bila polling mengganti daftar saat request berjalan', async () => {
    const store = useNotificationsStore()
    service.list.mockResolvedValueOnce(pageOf(range(3, 1), 1, 1, 3))
    await store.fetch()

    const post = deferred<any>()
    service.markRead.mockReturnValueOnce(post.promise)
    const marking = store.markRead('n2')
    // Polling selesai sebelum server memproses markRead: n2 masih belum dibaca
    service.list.mockResolvedValueOnce(pageOf(range(3, 1), 1, 1, 3))
    await store.fetch()
    post.resolve(n(2, true))
    await marking

    expect(store.items.find(x => x.id === 'n2')?.read_at).not.toBeNull()
    expect(store.unreadCount).toBe(2)
  })

  it('tandai semua dibaca juga mengenai salinan lama di halaman berikutnya', async () => {
    const store = useNotificationsStore()
    service.list.mockResolvedValueOnce(pageOf(range(4, 3), 1, 2, 4))
    await store.fetch()
    service.list.mockResolvedValueOnce(pageOf(range(2, 1), 2, 2, 4))
    await store.loadMore()
    // Halaman pertama bergeser sehingga n2 ada di halaman pertama dan di halaman lama
    service.list.mockResolvedValueOnce(pageOf([n(5), n(4), n(3), n(2)], 1, 2, 5))
    await store.fetch()
    service.markAllRead.mockResolvedValueOnce(undefined)
    await store.markAllRead()

    // Notifikasi baru mendorong n2 keluar dari halaman pertama: salinan lamanya harus sudah terbaca
    service.list.mockResolvedValueOnce(pageOf([n(7, true), n(6, true), n(5, true), n(4, true)], 1, 2, 0))
    await store.fetch()

    expect(store.items.filter(x => !x.read_at)).toEqual([])
  })

  it('fetch setelah reset tidak terhalang request user sebelumnya yang belum selesai', async () => {
    const store = useNotificationsStore()
    const stale = deferred<any>()
    service.list.mockReturnValueOnce(stale.promise)
    const oldFetch = store.fetch()
    store.reset()

    service.list.mockResolvedValueOnce(pageOf([n(9)], 1, 1, 1))
    await store.fetch()
    stale.resolve(pageOf([n(1)], 1, 1, 1))
    await oldFetch

    expect(ids(store.items)).toEqual(['n9'])
  })
})
