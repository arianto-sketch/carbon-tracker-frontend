<template>
  <v-container class="pa-6" fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Emission Factors</h1>
        <p class="text-body-2 text-medium-emphasis">Master data faktor emisi (admin only)</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">Tambah Faktor</v-btn>
    </div>

    <v-text-field v-model="search" placeholder="Cari faktor emisi..." prepend-inner-icon="mdi-magnify"
      variant="outlined" density="compact" clearable class="mb-4" style="max-width: 360px" />

    <v-table density="compact">
      <thead><tr>
        <th>Nama</th><th>Kategori</th><th>Scope</th><th>Satuan Input</th><th>Faktor saat ini (kg CO₂e)</th><th>Sumber</th><th>Status</th><th>Aksi</th>
      </tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="8" class="text-center pa-4"><v-progress-circular indeterminate size="24" /></td></tr>
        <tr v-else-if="!factors.length"><td colspan="8" class="text-center pa-4 text-medium-emphasis">Tidak ada data</td></tr>
        <tr v-for="f in factors" v-else :key="f.id">
          <td class="font-weight-medium">{{ f.name }}</td>
          <td>{{ f.category?.name }}</td>
          <td>{{ scopeLabel(f.scope) }}</td>
          <td>per {{ f.source_unit }}</td>
          <td>{{ f.factor_value }}</td>
          <td class="text-caption text-medium-emphasis">{{ f.source }}</td>
          <td><v-chip :color="f.is_active ? 'green' : 'grey'" size="x-small" variant="tonal">{{ f.is_active ? 'Aktif' : 'Nonaktif' }}</v-chip></td>
          <td>
            <v-btn icon="mdi-pencil" size="x-small" variant="text" :aria-label="`Edit ${f.name}`" @click="openDialog(f)" />
            <v-btn icon="mdi-calendar-clock" size="x-small" variant="text" :aria-label="`Nilai per periode ${f.name}`"
              @click="valuesFactor = f; valuesDialog = true" />
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" :aria-label="`Nonaktifkan ${f.name}`" @click="deactivate(f.id)" />
          </td>
        </tr>
      </tbody>
    </v-table>
    <ListPagination v-model="page" :meta="meta" />

    <v-dialog v-model="dialog" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-2">{{ editId ? 'Edit' : 'Tambah' }} Faktor Emisi</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id" label="Kategori"
              variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib']" class="mb-2" />
            <v-text-field v-model="form.name" label="Nama" variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib']" class="mb-2" />
            <v-text-field v-model="form.slug" label="Slug" variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib']" class="mb-2" />
            <v-row dense>
              <v-col cols="6"><v-text-field v-model="form.source_unit" label="Satuan Input" variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib']" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.factor_value" label="Nilai Faktor" type="number" variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib']" /></v-col>
            </v-row>
            <v-select v-model="form.scope" :items="GHG_SCOPE_OPTIONS" label="Scope GHG" variant="outlined" density="comfortable"
              hint="Entri yang sudah tercatat tetap memakai scope saat dicatat" persistent-hint class="mb-4" />
            <v-text-field v-model="form.source" label="Sumber Data" variant="outlined" density="comfortable" class="mb-2" />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <FactorValuesDialog v-model="valuesDialog" :factor="valuesFactor" @changed="load" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import FactorValuesDialog from '@/components/FactorValuesDialog.vue'
import ListPagination from '@/components/ListPagination.vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { usePageQuery } from '@/composables/usePageQuery'
import { categoriesService } from '@/services/categories.service'
import { getErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/ui.store'
import { GHG_SCOPE_OPTIONS, scopeLabel } from '@/utils/constants'

const ui = useUiStore()
const factors = ref<any[]>([])
const categories = ref<any[]>([])
const loading = ref(false)
const dialog = ref(false)
// Dialog nilai per periode (nilai faktor berbeda tiap tahun, mis. faktor listrik PLN)
const valuesDialog = ref(false)
const valuesFactor = ref<any>(null)
const saving = ref(false)
const editId = ref<number | null>(null)
const search = ref('')
const formRef = ref()
const emptyForm = () => ({ category_id: null, name: '', slug: '', source_unit: '', factor_value: null, scope: 3, source: '' })
const form = ref(emptyForm())

const meta = ref<any>(null)
const page = usePageQuery()

function openDialog(f?: any) {
  editId.value = f?.id ?? null
  form.value = f ? { category_id: f.category?.id, name: f.name, slug: f.slug,
    source_unit: f.source_unit, factor_value: f.factor_value, scope: f.scope ?? 3, source: f.source } : emptyForm()
  dialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (editId.value) {
      await categoriesService.updateFactor(editId.value, form.value)
      ui.showSnackbar('Faktor emisi diperbarui.')
    } else {
      await categoriesService.createFactor(form.value)
      ui.showSnackbar('Faktor emisi ditambahkan.')
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menyimpan.'))
  } finally { saving.value = false }
}

async function deactivate(id: number) {
  try {
    await categoriesService.deleteFactor(id)
    ui.showSnackbar('Faktor emisi dinonaktifkan.')
    await load()
  } catch { ui.showError('Gagal menonaktifkan.') }
}

const latest = useLatestRequest()

async function load() {
  const ticket = latest.next()
  loading.value = true
  try {
    const res = await categoriesService.listFactors({ page: page.value, ...(search.value ? { search: search.value } : {}) })
    if (!latest.isCurrent(ticket)) return
    factors.value = res.data
    meta.value = res.meta
  } finally { if (latest.isCurrent(ticket)) loading.value = false }
}

// Pencarian di server (debounce); filter berubah -> kembali ke halaman 1
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { if (page.value === 1) load(); else page.value = 1 }, 300)
})
watch(page, load)

onMounted(async () => {
  categories.value = await categoriesService.listCategories()
  await load()
})
onUnmounted(() => clearTimeout(searchTimer))
</script>
