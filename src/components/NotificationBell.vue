<template>
  <v-menu v-model="open" location="bottom end" :close-on-content-click="false" max-width="380">
    <template #activator="{ props: activator }">
      <v-btn v-bind="activator" icon variant="text" aria-label="Notifikasi">
        <v-badge :model-value="store.unreadCount > 0" :content="store.unreadCount" color="error">
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card rounded="lg" min-width="320">
      <div class="d-flex align-center pa-3 pb-1">
        <span class="font-weight-bold">Notifikasi</span>
        <v-spacer />
        <v-btn v-if="store.unreadCount > 0" size="small" variant="text" @click="markAll">Tandai semua dibaca</v-btn>
      </div>
      <v-divider />
      <p v-if="!store.items.length" class="text-body-2 text-medium-emphasis text-center pa-6">Belum ada notifikasi.</p>
      <v-list v-else density="compact" max-height="420" class="py-0">
        <v-list-item v-for="n in store.items" :key="n.id" :class="{ 'bg-green-lighten-5': !n.read_at }" lines="three"
          @click="openNotification(n)">
          <template #prepend>
            <v-icon :color="ICONS[n.data.type]?.color ?? 'grey'" size="small">{{ ICONS[n.data.type]?.icon ?? 'mdi-bell' }}</v-icon>
          </template>
          <v-list-item-title class="text-body-2 text-wrap" :class="{ 'font-weight-bold': !n.read_at }">
            {{ n.data.message }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="n.data.reason" class="text-wrap">Alasan: {{ n.data.reason }}</v-list-item-subtitle>
          <v-list-item-subtitle>{{ formatDateTime(n.created_at) }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useUiStore } from '@/stores/ui.store'
import { getErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/formatters'

const ICONS: Record<string, { icon: string; color: string }> = {
  entry_submitted: { icon: 'mdi-send', color: 'orange' },
  entry_approved: { icon: 'mdi-check-circle', color: 'green' },
  entry_rejected: { icon: 'mdi-close-circle', color: 'red' },
}
const POLL_MS = 60_000

const store = useNotificationsStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const open = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

async function openNotification(n: any) {
  try {
    await store.markRead(n.id)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menandai notifikasi.'))
  }
  open.value = false
  if (n.data.project_id) router.push(`/projects/${n.data.project_id}`)
}

async function markAll() {
  try {
    await store.markAllRead()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menandai notifikasi.'))
  }
}

// Muat saat awal, berkala, dan tiap pindah halaman; menu dibuka juga memuat ulang
onMounted(() => {
  store.fetch()
  timer = setInterval(store.fetch, POLL_MS)
})
onUnmounted(() => clearInterval(timer))
watch(() => route.fullPath, () => store.fetch())
watch(open, isOpen => { if (isOpen) store.fetch() })
</script>
