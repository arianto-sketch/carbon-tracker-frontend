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
          <td><v-btn icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit user" @click="openDialog(u)" /></td>
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { usersService } from '@/services/users.service'
import { getErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', pm: 'Project Manager', viewer: 'Viewer' }
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

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value }
    if (search.value) params.search = search.value
    if (roleFilter.value) params.role = roleFilter.value
    const res = await usersService.list(params)
    users.value = res.data
    meta.value = res.meta
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal memuat user.'))
  } finally { loading.value = false }
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
  searchTimer = setTimeout(() => { page.value === 1 ? load() : (page.value = 1) }, 300)
})
watch(roleFilter, () => { page.value === 1 ? load() : (page.value = 1) })
watch(page, load)

onMounted(load)
</script>
