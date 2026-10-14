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

  const items = computed(() => {
    const latestIds = new Set(latest.value.map(n => n.id))
    return [...latest.value, ...older.value.filter(n => !latestIds.has(n.id))]
  })
  const hasMore = computed(() => page.value < lastPage.value)

  // Naik setiap kali state lokal lebih baru dari server (tandai dibaca, logout): respons fetch
  // yang dikirim sebelumnya diabaikan supaya tidak menimpa state itu.
  let generation = 0
  let inFlight = false

  // Gagal memuat notifikasi tidak perlu mengganggu user (dipanggil berkala di background)
  async function fetch() {
    if (inFlight) return
    inFlight = true
    const startedAt = generation
    try {
      const res = await notificationsService.list()
      if (startedAt !== generation) return
      latest.value = res.data
      unreadCount.value = res.meta.unread_count
      lastPage.value = Math.max(res.meta.last_page, page.value)
    } catch { /* abaikan; dicoba lagi pada polling berikutnya */ } finally {
      inFlight = false
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

  async function markRead(id: string) {
    const target = items.value.find(n => n.id === id)
    if (!target || target.read_at) return
    const updated = await notificationsService.markRead(id)
    generation++
    Object.assign(target, updated)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead() {
    await notificationsService.markAllRead()
    generation++
    const now = new Date().toISOString()
    items.value.forEach(n => { n.read_at ??= now })
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
