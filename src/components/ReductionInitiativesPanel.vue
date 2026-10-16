<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div class="d-flex flex-wrap ga-6">
        <div role="group" aria-label="Potensi reduksi">
          <div class="text-h6 font-weight-bold text-primary">{{ formatCo2(totals.planned_kg) }}</div>
          <div class="text-caption text-medium-emphasis">Potensi reduksi per tahun (direncanakan &amp; berjalan)</div>
        </div>
        <div role="group" aria-label="Reduksi tercapai">
          <div class="text-h6 font-weight-bold text-success">{{ formatCo2(totals.done_kg) }}</div>
          <div class="text-caption text-medium-emphasis">Reduksi per tahun dari inisiatif selesai</div>
        </div>
      </div>
      <v-btn v-if="canWrite" color="primary" prepend-icon="mdi-plus" @click="openCreate">Tambah Inisiatif</v-btn>
    </div>

    <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mb-3">
      Gagal memuat rencana aksi.
      <template #append><v-btn variant="text" size="small" @click="load">Coba lagi</v-btn></template>
    </v-alert>

    <v-table density="compact">
      <caption class="d-sr-only">Rencana aksi reduksi emisi</caption>
      <thead><tr>
        <th>Inisiatif</th><th>Kategori</th><th class="text-right">Estimasi / tahun</th>
        <th>PIC</th><th>Target</th><th>Status</th><th v-if="canWrite">Aksi</th>
      </tr></thead>
      <tbody>
        <tr v-if="loading && !initiatives.length">
          <td :colspan="columns" class="text-center pa-4"><v-progress-circular indeterminate size="24" color="primary" /></td>
        </tr>
        <tr v-else-if="!initiatives.length && !loadError">
          <td :colspan="columns">
            <EmptyState compact icon="mdi-leaf" title="Belum ada rencana aksi"
              :text="canWrite ? 'Catat langkah pengurangan emisi beserta estimasi penghematannya.' : undefined" />
          </td>
        </tr>
        <tr v-for="i in initiatives" :key="i.id">
          <td style="min-width: 200px">
            <div class="font-weight-medium">{{ i.title }}</div>
            <div v-if="i.description" class="text-caption text-medium-emphasis" style="max-width: 320px">{{ i.description }}</div>
          </td>
          <td>{{ i.category?.name ?? '-' }}</td>
          <td class="text-right text-no-wrap">{{ formatCo2(i.estimated_reduction_kg) }}</td>
          <td>{{ i.pic?.name ?? '-' }}</td>
          <td class="text-no-wrap">
            {{ i.target_date ? formatDate(i.target_date) : '-' }}
            <div v-if="isOverdue(i, today)" class="text-caption text-error">Lewat target</div>
          </td>
          <td>
            <v-chip :color="INITIATIVE_STATUS_COLORS[i.status] ?? 'grey'" size="x-small" variant="tonal">
              {{ INITIATIVE_STATUS_LABELS[i.status] ?? i.status }}
            </v-chip>
            <div v-if="i.status === 'done' && i.completed_at" class="text-caption text-medium-emphasis">{{ formatDate(i.completed_at) }}</div>
          </td>
          <td v-if="canWrite" class="text-no-wrap">
            <v-btn icon="mdi-pencil" size="x-small" variant="text" :aria-label="`Ubah ${i.title}`" @click="openEdit(i)" />
            <v-btn v-if="canDelete" icon="mdi-delete" size="x-small" variant="text" color="error" :aria-label="`Hapus ${i.title}`"
              @click="deleting = i" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="560" aria-labelledby="initiative-form-title">
      <v-card rounded="lg">
        <v-card-title id="initiative-form-title" class="pa-5 pb-2">{{ editing ? 'Ubah Inisiatif' : 'Tambah Inisiatif' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-row dense>
              <v-col cols="12">
                <v-text-field v-model="form.title" label="Judul" variant="outlined" density="comfortable" counter="200"
                  placeholder="mis. Ganti lampu kantor ke LED"
                  :rules="[(v: string) => !!v?.trim() || 'Wajib diisi', (v: string) => (v?.length ?? 0) <= 200 || 'Maksimal 200 karakter']" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.description" label="Keterangan" variant="outlined" density="comfortable" rows="2" auto-grow
                  counter="2000" :rules="[(v: string) => (v?.length ?? 0) <= 2000 || 'Maksimal 2000 karakter']" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.estimated_reduction_kg" label="Estimasi reduksi (kg CO₂e/tahun)" type="number" min="0"
                  variant="outlined" density="comfortable" :rules="[estimateRule]" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.status" :items="statusOptions" label="Status" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.category_id" :items="categoryOptions" label="Kategori" variant="outlined" density="comfortable"
                  clearable />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="form.pic_user_id" :items="picOptions" label="PIC" variant="outlined" density="comfortable" clearable />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.target_date" label="Target tanggal" type="date" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!deleting" max-width="420" aria-labelledby="initiative-delete-title"
      @update:model-value="(open: boolean) => { if (!open) deleting = null }">
      <v-card rounded="lg">
        <v-card-title id="initiative-delete-title" class="pa-5 pb-2">Hapus inisiatif?</v-card-title>
        <v-card-text>"{{ deleting?.title }}" dihapus dari rencana aksi project ini.</v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="deleting = null">Batal</v-btn>
          <v-btn color="error" :loading="removing" @click="remove">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { getErrorMessage } from '@/services/api'
import { categoriesService } from '@/services/categories.service'
import { initiativesService, type Initiative, type InitiativePayload, type InitiativeStatus, type InitiativeTotals } from '@/services/initiatives.service'
import { useUiStore } from '@/stores/ui.store'
import { INITIATIVE_STATUS_COLORS, INITIATIVE_STATUS_LABELS } from '@/utils/constants'
import { localToday } from '@/utils/dates'
import { formatCo2, formatDate } from '@/utils/formatters'
import { isOverdue } from '@/utils/initiatives'

// canWrite: owner/member (bukan viewer) atau admin; canDelete: owner atau admin. Backend menegakkan aturan yang sama.
const props = defineProps<{ projectId: number; members: any[]; canWrite: boolean; canDelete: boolean }>()
const ui = useUiStore()
const today = localToday()

const initiatives = ref<Initiative[]>([])
const totals = ref<InitiativeTotals>({ planned_kg: 0, done_kg: 0 })
const loading = ref(false)
const loadError = ref(false)
const columns = computed(() => (props.canWrite ? 7 : 6))

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const res = await initiativesService.list(props.projectId)
    initiatives.value = res.data
    totals.value = res.meta
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const statusOptions = Object.entries(INITIATIVE_STATUS_LABELS).map(([value, title]) => ({ title, value }))
const categoryOptions = ref<{ title: string; value: number }[]>([])

type Form = Omit<InitiativePayload, 'estimated_reduction_kg' | 'description' | 'target_date'> & {
  estimated_reduction_kg: string | number
  description: string
  target_date: string
}
const dialog = ref(false)
const editing = ref<Initiative | null>(null)
const formRef = ref()
const saving = ref(false)
const form = ref<Form>(emptyForm())

function emptyForm(): Form {
  return { title: '', description: '', category_id: null, estimated_reduction_kg: '', status: 'planned', pic_user_id: null, target_date: '' }
}

// PIC: anggota aktif project; PIC lama yang sudah keluar tetap tampil saat inisiatifnya diubah
const picOptions = computed(() => {
  const options = props.members
    .filter(m => m.user && m.user.is_active !== false)
    .map(m => ({ title: m.user.name, value: m.user.id }))
  const current = editing.value?.pic
  if (current && !options.some(o => o.value === current.id)) options.push({ title: current.name, value: current.id })
  return options
})

function estimateRule(v: string | number): true | string {
  if (v === '' || v === null) return 'Wajib diisi'
  const n = Number(v)
  if (Number.isNaN(n)) return 'Harus berupa angka'
  return (n >= 0 && n <= 1_000_000_000) || 'Antara 0 sampai 1.000.000.000'
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  dialog.value = true
}

function openEdit(i: Initiative) {
  editing.value = i
  form.value = {
    title: i.title,
    description: i.description ?? '',
    category_id: i.category?.id ?? null,
    estimated_reduction_kg: i.estimated_reduction_kg,
    status: i.status,
    pic_user_id: i.pic?.id ?? null,
    target_date: i.target_date ?? '',
  }
  dialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const f = form.value
  const payload: InitiativePayload = {
    title: f.title.trim(),
    description: f.description.trim() || null,
    category_id: f.category_id,
    estimated_reduction_kg: Number(f.estimated_reduction_kg),
    status: f.status as InitiativeStatus,
    pic_user_id: f.pic_user_id,
    target_date: f.target_date || null,
  }
  saving.value = true
  try {
    if (editing.value) await initiativesService.update(props.projectId, editing.value.id, payload)
    else await initiativesService.create(props.projectId, payload)
    ui.showSnackbar(editing.value ? 'Inisiatif berhasil diperbarui.' : 'Inisiatif berhasil ditambahkan.')
    dialog.value = false
    await load()
  } catch (e: any) {
    // Dialog tetap terbuka agar isian tidak hilang
    ui.showError(getErrorMessage(e, 'Gagal menyimpan inisiatif.'))
  } finally {
    saving.value = false
  }
}

const deleting = ref<Initiative | null>(null)
const removing = ref(false)

async function remove() {
  if (!deleting.value) return
  removing.value = true
  try {
    await initiativesService.remove(props.projectId, deleting.value.id)
    ui.showSnackbar('Inisiatif berhasil dihapus.')
    deleting.value = null
    await load()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menghapus inisiatif.'))
  } finally {
    removing.value = false
  }
}

onMounted(async () => {
  await load()
  try {
    const categories = await categoriesService.listCategories()
    categoryOptions.value = categories.map((c: any) => ({ title: c.name, value: c.id }))
  } catch {
    // Kategori opsional: form tetap bisa dipakai tanpa daftar kategori
  }
})
</script>
