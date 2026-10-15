<template>
  <v-container class="pa-6" fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Users</h1>
        <p class="text-body-2 text-medium-emphasis">Kelola akun, role, dan status user (admin only)</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openDialog()">Tambah User</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-3 mb-4">
      <v-text-field v-model="search" placeholder="Cari nama atau email..." prepend-inner-icon="mdi-magnify"
        variant="outlined" density="compact" clearable hide-details style="max-width: 320px" />
      <v-select v-model="roleFilter" :items="roleFilterOptions" label="Role" variant="outlined" density="compact"
        hide-details style="max-width: 180px" />
    </div>

    <v-table density="compact">
      <thead><tr>
        <th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th>
      </tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="5" class="text-center pa-4"><v-progress-circular indeterminate size="24" /></td></tr>
        <tr v-else-if="!users.length"><td colspan="5" class="text-center pa-4 text-medium-emphasis">Tidak ada user</td></tr>
        <tr v-for="u in users" v-else :key="u.id">
          <td class="font-weight-medium">{{ u.name }}<span v-if="u.id === authStore.user?.id" class="text-caption text-medium-emphasis"> (Anda)</span></td>
          <td>{{ u.email }}</td>
          <td>{{ ROLE_LABELS[u.role] ?? u.role }}</td>
          <td><v-chip :color="u.is_active ? 'green' : 'grey'" size="x-small" variant="tonal">{{ u.is_active ? 'Aktif' : 'Nonaktif' }}</v-chip></td>
          <td>
            <v-btn icon="mdi-pencil" size="x-small" variant="text" :aria-label="`Edit user ${u.name}`" @click="openDialog(u)" />
            <v-btn icon="mdi-history" size="x-small" variant="text" :aria-label="`Riwayat user ${u.name}`" @click="openHistory(u)" />
            <v-btn icon="mdi-lock-reset" size="x-small" variant="text" :aria-label="`Kirim link reset password ${u.name}`"
              :disabled="!u.is_active" :loading="sendingResetFor === u.id" @click="sendResetLink(u)" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <div v-if="meta.last_page > 1" class="d-flex align-center justify-space-between mt-4">
      <span class="text-caption text-medium-emphasis">Total {{ meta.total }} user</span>
      <v-pagination v-model="page" :length="meta.last_page" density="compact" :total-visible="5" />
    </div>

    <v-dialog v-model="dialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-2">{{ editId ? 'Edit' : 'Tambah' }} User</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field v-model="form.name" label="Nama" variant="outlined" density="comfortable" :rules="[required]" class="mb-2" />
            <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" density="comfortable"
              :rules="[required]" :disabled="!!editId" class="mb-2" />
            <template v-if="!editId">
              <v-text-field v-model="form.password" label="Password" type="password" variant="outlined" density="comfortable"
                :rules="[required, v => v.length >= 8 || 'Minimal 8 karakter']" class="mb-2" />
              <v-text-field v-model="form.password_confirmation" label="Konfirmasi Password" type="password" variant="outlined"
                density="comfortable" :rules="[v => v === form.password || 'Konfirmasi tidak sesuai']" class="mb-2" />
            </template>
            <v-select v-model="form.role" :items="roleOptions" label="Role" variant="outlined" density="comfortable" class="mb-2" />
            <v-switch v-if="editId" v-model="form.is_active" label="Akun aktif" color="primary" density="comfortable"
              :disabled="editId === authStore.user?.id" hide-details />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Riwayat perubahan nama, role, dan status akun (dicatat backend di audit log) -->
    <v-dialog v-model="historyDialog" max-width="520" aria-labelledby="user-history-title">
      <v-card rounded="lg">
        <v-card-title id="user-history-title" class="pa-5 pb-2">Riwayat {{ historyUser?.name }}</v-card-title>
        <v-card-text>
          <div v-if="historyLoading" class="text-center pa-4">
            <v-progress-circular indeterminate size="24" aria-label="Memuat riwayat" />
          </div>
          <p v-else-if="!history.length" class="text-body-2 text-medium-emphasis">Belum ada riwayat perubahan.</p>
          <v-list v-else density="compact" class="py-0">
            <v-list-item v-for="h in history" :key="h.id" class="px-0">
              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ ACTION_LABELS[h.action] ?? 'Diubah' }} oleh {{ h.user?.name ?? 'sistem' }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ formatDateTime(h.created_at) }}</v-list-item-subtitle>
              <ul class="change-lines text-body-2 mt-1">
                <li v-for="line in changeLines(h)" :key="line">{{ line }}</li>
              </ul>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="historyDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { usersService, type UserHistoryEntry } from '@/services/users.service'
import { getErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { formatDateTime } from '@/utils/formatters'

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', pm: 'Project Manager', viewer: 'Viewer' }
const FIELD_LABELS: Record<string, string> = { name: 'Nama', role: 'Role', is_active: 'Status' }
const ACTION_LABELS: Record<string, string> = {
  created: 'Dibuat',
  updated: 'Diubah',
  password_reset_link_sent: 'Link reset password dikirim',
  password_reset: 'Password direset',
}
const roleOptions = Object.entries(ROLE_LABELS).map(([value, title]) => ({ title, value }))
const roleFilterOptions = [{ title: 'Semua', value: '' }, ...roleOptions]

const authStore = useAuthStore()
const ui = useUiStore()
const users = ref<any[]>([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const page = ref(1)
const search = ref('')
const roleFilter = ref('')
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editId = ref<number | null>(null)
const formRef = ref()
const emptyForm = () => ({ name: '', email: '', password: '', password_confirmation: '', role: 'pm', is_active: true })
const form = ref(emptyForm())
const required = (v: any) => !!v || 'Wajib diisi'

const historyDialog = ref(false)
const historyLoading = ref(false)
const historyUser = ref<any>(null)
const history = ref<UserHistoryEntry[]>([])
// Riwayat user lain yang dibuka sebelumnya bisa selesai belakangan: hanya respons terakhir dipakai
const latestHistory = useLatestRequest()

function fieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (field === 'role') return ROLE_LABELS[value as string] ?? String(value)
  if (field === 'is_active') return value ? 'Aktif' : 'Nonaktif'
  return String(value)
}

// "Role: Project Manager → Viewer"; saat dibuat (tanpa nilai lama) cukup nilai awalnya
function changeLines(entry: UserHistoryEntry): string[] {
  return Object.entries(entry.changes ?? {}).map(([field, change]) => {
    const label = FIELD_LABELS[field] ?? field
    return entry.action === 'created'
      ? `${label}: ${fieldValue(field, change.new)}`
      : `${label}: ${fieldValue(field, change.old)} → ${fieldValue(field, change.new)}`
  })
}

const sendingResetFor = ref<number | null>(null)

async function sendResetLink(u: any) {
  sendingResetFor.value = u.id
  try {
    ui.showSnackbar(await usersService.sendPasswordResetLink(u.id))
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengirim link reset password.'))
  } finally {
    sendingResetFor.value = null
  }
}

async function openHistory(u: any) {
  const ticket = latestHistory.next()
  historyUser.value = u
  history.value = []
  historyDialog.value = true
  historyLoading.value = true
  try {
    const entries = await usersService.history(u.id)
    if (latestHistory.isCurrent(ticket)) history.value = entries
  } catch (e: any) {
    if (latestHistory.isCurrent(ticket)) ui.showError(getErrorMessage(e, 'Gagal memuat riwayat user.'))
  } finally {
    if (latestHistory.isCurrent(ticket)) historyLoading.value = false
  }
}

// Dialog ditutup: respons yang masih berjalan tidak dipakai lagi
watch(historyDialog, (open) => { if (!open) latestHistory.next() })

const latest = useLatestRequest()

async function load() {
  const ticket = latest.next()
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value }
    if (search.value) params.search = search.value
    if (roleFilter.value) params.role = roleFilter.value
    const res = await usersService.list(params)
    if (!latest.isCurrent(ticket)) return
    users.value = res.data
    meta.value = res.meta
  } catch (e: any) {
    if (latest.isCurrent(ticket)) ui.showError(getErrorMessage(e, 'Gagal memuat user.'))
  } finally { if (latest.isCurrent(ticket)) loading.value = false }
}

function openDialog(u?: any) {
  editId.value = u?.id ?? null
  form.value = u ? { ...emptyForm(), name: u.name, email: u.email, role: u.role, is_active: u.is_active } : emptyForm()
  dialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (editId.value) {
      const { name, role, is_active } = form.value
      await usersService.update(editId.value, { name, role, is_active })
      ui.showSnackbar('User diperbarui.')
    } else {
      const { is_active: _ignored, ...payload } = form.value
      await usersService.create(payload)
      ui.showSnackbar('User ditambahkan.')
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menyimpan user.'))
  } finally { saving.value = false }
}

// Filter berubah -> kembali ke halaman 1; ketikan pencarian di-debounce
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { if (page.value === 1) load(); else page.value = 1 }, 300)
})
watch(roleFilter, () => { if (page.value === 1) load(); else page.value = 1 })
watch(page, load)

onMounted(load)
onUnmounted(() => clearTimeout(searchTimer))
</script>

<style scoped>
.change-lines {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
