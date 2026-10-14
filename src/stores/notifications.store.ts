import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { notificationsService } from '@/services/notifications.service'

export const useNotificationsStore = defineStore('notifications', () => {
  // Halaman pertama diperbarui oleh polling; halaman lama ditambahkan lewat loadMore() dan tidak
  // hilang saat polling berikutnya memperbarui halaman pertama.
  const latest = ref<any[]>([])
  const older = ref<any[]>([])
  const unreadCount = ref(0)
  const page = ref(1)
  const lastPage = ref(1)
  const loadingMore = ref(false)

  // Halaman bisa saling tumpang tindih karena notifikasi baru menggeser offset: tampilkan tiap id
  // sekali, utamakan salinan dari halaman pertama (paling baru dari server)
  const items = computed(() => {
    const seen = new Set<string>()
    return [...latest.value, ...older.value].filter(n => !seen.has(n.id) && !!seen.add(n.id))
  })
  const hasMore = computed(() => page.value < lastPage.value)

  // Naik setiap kali state lokal lebih baru dari server (tandai dibaca, logout): respons fetch
  // yang dikirim sebelumnya diabaikan supaya tidak menimpa state itu.
  let generation = 0
  // Generation milik fetch yang sedang berjalan; fetch milik generation lama (mis. sebelum logout)
  // tidak menghalangi fetch baru
  let inFlight: number | null = null

  // Gagal memuat notifikasi tidak perlu mengganggu user (dipanggil berkala di background)
  async function fetch() {
    if (inFlight === generation) return
    const startedAt = generation
    inFlight = startedAt
    try {
      const res = await notificationsService.list()
      if (startedAt !== generation) return
      if (page.value > 1) {
        // Item yang tergeser keluar dari halaman pertama sudah dimuat user: pindahkan ke halaman lama
        const freshIds = new Set(res.data.map((n: any) => n.id))
        older.value = [...latest.value.filter(n => !freshIds.has(n.id)), ...older.value]
      }
      latest.value = res.data
      unreadCount.value = res.meta.unread_count
      lastPage.value = Math.max(res.meta.last_page, page.value)
    } catch { /* abaikan; dicoba lagi pada polling berikutnya */ } finally {
      if (inFlight === startedAt) inFlight = null
    }
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
    const startedAt = generation
    try {
      const res = await notificationsService.list({ page: page.value + 1 })
      if (startedAt !== generation) return
      older.value = [...older.value, ...res.data]
      page.value = res.meta.current_page
      lastPage.value = res.meta.last_page
      unreadCount.value = res.meta.unread_count
    } finally {
      loadingMore.value = false
    }
  }

  // Semua salinan (halaman pertama dan halaman lama), termasuk yang tersembunyi oleh dedupe
  const copiesOf = (id: string) => [...latest.value, ...older.value].filter(n => n.id === id)

  async function markRead(id: string) {
    if (!copiesOf(id).some(n => !n.read_at)) return
    // Naik sebelum dan sesudah request: fetch yang berjalan selama POST bisa membawa state lama
    generation++
    const updated = await notificationsService.markRead(id)
    generation++
    // Cari ulang setelah await: polling bisa sudah mengganti objeknya
    const copies = copiesOf(id)
    const wasUnread = copies.some(n => !n.read_at)
    copies.forEach(n => Object.assign(n, updated))
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead() {
    generation++
    await notificationsService.markAllRead()
    generation++
    const now = new Date().toISOString()
    for (const n of [...latest.value, ...older.value]) n.read_at ??= now
    unreadCount.value = 0
  }

  function reset() {
    generation++
    latest.value = []
    older.value = []
    unreadCount.value = 0
    page.value = 1
    lastPage.value = 1
  }

  return { items, unreadCount, hasMore, loadingMore, fetch, loadMore, markRead, markAllRead, reset }
})
