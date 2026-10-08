import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsService } from '@/services/notifications.service'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<any[]>([])
  const unreadCount = ref(0)

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
      items.value = res.data
      unreadCount.value = res.meta.unread_count
    } catch { /* abaikan; dicoba lagi pada polling berikutnya */ } finally {
      inFlight = false
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
    items.value = []
    unreadCount.value = 0
  }

  return { items, unreadCount, fetch, markRead, markAllRead, reset }
})
