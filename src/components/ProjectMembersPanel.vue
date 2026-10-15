<template>
  <div>
    <div v-if="canManage" class="d-flex justify-end mb-2">
      <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openAdd">Tambah anggota</v-btn>
    </div>

    <v-list>
      <v-list-item v-for="m in members" :key="m.id" class="px-0">
        <template #prepend>
          <v-avatar color="primary" size="36"><span class="text-white">{{ m.user?.name?.[0] }}</span></v-avatar>
        </template>
        <v-list-item-title>{{ m.user?.name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ m.user?.email }}<span v-if="m.user?.role === 'viewer'"> · role global Viewer (hanya baca)</span>
        </v-list-item-subtitle>
        <template #append>
          <div v-if="canManage" class="d-flex align-center ga-1">
            <v-select :model-value="busyUserId === m.user?.id && pendingRole ? pendingRole : m.role" :items="roleOptionsFor(m.user)" label="Role" :aria-label="`Role ${m.user?.name}`" variant="outlined" density="compact"
              hide-details style="width: 140px" :loading="busyUserId === m.user?.id" :disabled="busyUserId === m.user?.id"
              @update:model-value="(role: string) => changeRole(m, role)" />
            <v-btn icon="mdi-account-remove" variant="text" size="small" color="error" :aria-label="`Keluarkan ${m.user?.name}`"
              :disabled="m.role === 'owner' || busyUserId !== null" @click="removing = m" />
          </div>
          <v-chip v-else size="small" variant="tonal">{{ PROJECT_ROLE_LABELS[m.role] ?? m.role }}</v-chip>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="addDialog" max-width="480" aria-labelledby="add-member-title">
      <v-card rounded="lg">
        <v-card-title id="add-member-title" class="pa-5 pb-2">Tambah anggota</v-card-title>
        <v-card-text>
          <v-autocomplete v-model="candidate" v-model:search="search" :items="candidates" :loading="searching"
            :item-title="lookupTitle" return-object no-filter
            label="Cari user" placeholder="Ketik minimal 2 huruf nama atau email" variant="outlined" density="comfortable"
            :no-data-text="search && search.length >= 2 ? 'User tidak ditemukan' : 'Ketik minimal 2 huruf'" class="mb-2" />
          <v-select v-model="newRole" :items="roleOptionsFor(candidate)" label="Role di project" variant="outlined"
            density="comfortable" :disabled="!candidate" persistent-hint
            :hint="candidate?.role === 'viewer' ? 'User ber-role Viewer hanya bisa menjadi viewer di project.' : ROLE_HINTS[newRole]" />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Batal</v-btn>
          <v-btn color="primary" :disabled="!candidate" :loading="adding" @click="add">Tambahkan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!removing" max-width="420" aria-labelledby="remove-member-title"
      @update:model-value="(open: boolean) => { if (!open) removing = null }">
      <v-card rounded="lg">
        <v-card-title id="remove-member-title" class="pa-5 pb-2">Keluarkan anggota?</v-card-title>
        <v-card-text>{{ removing?.user?.name }} tidak lagi bisa melihat atau mengubah data project ini.</v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="removing = null">Batal</v-btn>
          <v-btn color="error" :loading="!!removing && busyUserId === removing.user?.id" @click="remove">Keluarkan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { getErrorMessage } from '@/services/api'
import { projectsService } from '@/services/projects.service'
import { usersService, type UserLookup } from '@/services/users.service'
import { useUiStore } from '@/stores/ui.store'
import { PROJECT_ROLE_LABELS } from '@/utils/constants'

// reload: muat ulang anggota (dan role user sendiri) di parent; ditunggu sebelum baris aktif lagi,
// supaya pilihan berikutnya selalu berdasarkan data terbaru. Gagal muat ditampilkan parent sendiri
// dan tidak dianggap gagalnya aksi (lihat refresh)
const props = defineProps<{ projectId: number; members: any[]; canManage: boolean; reload: () => Promise<void> }>()
const ui = useUiStore()

const ROLE_HINTS: Record<string, string> = {
  owner: 'Mengelola project, anggota, target, dan meng-approve entri.',
  member: 'Mencatat dan mengirim entri untuk di-approve.',
  viewer: 'Hanya melihat data project.',
}
const ALL_ROLES = Object.entries(PROJECT_ROLE_LABELS).map(([value, title]) => ({ title, value }))

// Sama dengan aturan backend: user ber-role global Viewer hanya bisa menjadi viewer project
function roleOptionsFor(user: { role?: string } | null | undefined) {
  return user?.role === 'viewer' ? ALL_ROLES.filter(r => r.value === 'viewer') : ALL_ROLES
}

const addDialog = ref(false)
const candidate = ref<UserLookup | null>(null)
const candidates = ref<UserLookup[]>([])
const search = ref('')
const searching = ref(false)
const newRole = ref('member')
const adding = ref(false)
const removing = ref<any>(null)
const busyUserId = ref<number | null>(null)
const pendingRole = ref<string | null>(null)

const lookupTitle = (u: UserLookup) => `${u.name} (${u.email})`
const refresh = () => props.reload().catch(() => undefined)

function openAdd() {
  candidate.value = null
  candidates.value = []
  search.value = ''
  newRole.value = 'member'
  addDialog.value = true
}

watch(candidate, (u) => { newRole.value = u?.role === 'viewer' ? 'viewer' : 'member' })

// Cari di server (debounce); hanya hasil pencarian terakhir yang dipakai
const latestSearch = useLatestRequest()
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (term) => {
  clearTimeout(searchTimer)
  if (candidate.value && term === lookupTitle(candidate.value)) return
  if (!term || term.length < 2) {
    // Kata kunci dihapus: hasil pencarian yang masih berjalan tidak dipakai lagi
    latestSearch.next()
    searching.value = false
    candidates.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    const ticket = latestSearch.next()
    searching.value = true
    try {
      const memberIds = new Set(props.members.map(m => m.user?.id))
      const found = await usersService.lookup(term)
      if (latestSearch.isCurrent(ticket)) candidates.value = found.filter(u => !memberIds.has(u.id))
    } catch (e: any) {
      if (latestSearch.isCurrent(ticket)) ui.showError(getErrorMessage(e, 'Gagal mencari user.'))
    } finally {
      if (latestSearch.isCurrent(ticket)) searching.value = false
    }
  }, 300)
})
onUnmounted(() => clearTimeout(searchTimer))

async function add() {
  if (!candidate.value) return
  adding.value = true
  try {
    await projectsService.addMember(props.projectId, { user_id: candidate.value.id, role: newRole.value })
    ui.showSnackbar(`${candidate.value.name} ditambahkan sebagai ${PROJECT_ROLE_LABELS[newRole.value]}.`)
    addDialog.value = false
    await refresh()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menambah anggota.'))
  } finally {
    adding.value = false
  }
}

async function changeRole(m: any, role: string) {
  if (role === m.role || busyUserId.value !== null) return
  busyUserId.value = m.user?.id
  pendingRole.value = role
  try {
    await projectsService.updateMember(props.projectId, m.user.id, role)
    ui.showSnackbar(`Role ${m.user.name} diubah menjadi ${PROJECT_ROLE_LABELS[role]}.`)
    await refresh()
  } catch (e: any) {
    // Pilihan di select kembali ke role semula karena nilainya tetap dari data member
    ui.showError(getErrorMessage(e, 'Gagal mengubah role.'))
  } finally {
    busyUserId.value = null
    pendingRole.value = null
  }
}

async function remove() {
  const m = removing.value
  if (!m) return
  busyUserId.value = m.user?.id
  try {
    await projectsService.removeMember(props.projectId, m.user.id)
    ui.showSnackbar(`${m.user.name} dikeluarkan dari project.`)
    removing.value = null
    await refresh()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengeluarkan anggota.'))
  } finally {
    busyUserId.value = null
  }
}
</script>
