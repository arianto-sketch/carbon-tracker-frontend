<template>
  <v-dialog :model-value="modelValue" max-width="680" aria-labelledby="factor-values-title"
    @update:model-value="(open: boolean) => emit('update:modelValue', open)">
    <v-card v-if="factor" rounded="lg">
      <v-card-title id="factor-values-title" class="pa-5 pb-2">Nilai {{ factor.name }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Entri memakai nilai yang berlaku pada tanggal aktivitasnya. Menambah, mengubah, atau menghapus nilai
          menghitung ulang entri draft/ditolak; entri yang sudah diajukan/disetujui tidak berubah.
        </p>

        <v-alert v-if="result" :type="result.locked ? 'warning' : 'success'" variant="tonal" density="compact" class="mb-3">
          <div>{{ result.recalculated ? `${result.recalculated} entri draft/ditolak dihitung ulang dengan nilai baru.` : 'Tidak ada entri draft/ditolak yang perlu dihitung ulang.' }}</div>
          <div v-if="result.locked">{{ result.locked }} entri yang sudah diajukan/disetujui tetap memakai nilai lama.</div>
        </v-alert>
        <v-alert v-else-if="locked" type="info" variant="tonal" density="compact" class="mb-3">
          {{ locked }} entri yang sudah diajukan/disetujui memakai nilai yang berbeda dari periodenya.
        </v-alert>

        <div v-if="loading" class="text-center pa-4"><v-progress-circular indeterminate size="24" aria-label="Memuat nilai" /></div>
        <div v-else-if="loadError" class="text-center pa-4">
          <p class="text-body-2 text-medium-emphasis mb-2">Daftar periode gagal dimuat.</p>
          <v-btn size="small" variant="tonal" @click="load">Muat ulang</v-btn>
        </div>
        <v-table v-else density="compact" class="mb-4">
          <caption class="d-sr-only">Periode nilai faktor</caption>
          <thead><tr><th>Berlaku</th><th class="text-right">Nilai</th><th>Sumber</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>
            <tr v-for="p in periods" :key="p.id">
              <td class="text-no-wrap">{{ periodLabel(p) }}</td>
              <td class="text-right">
                <v-text-field v-if="editingId === p.id" v-model.number="editValue" type="number" min="0" step="any"
                  density="compact" variant="outlined" :error-messages="editError" :aria-label="`Nilai baru periode mulai ${formatDate(p.valid_from)}`"
                  style="max-width: 140px; margin-left: auto" />
                <template v-else>{{ formatFactor(p.factor_value) }}</template>
              </td>
              <td class="text-caption text-medium-emphasis">{{ p.source ?? '-' }}</td>
              <td class="text-right text-no-wrap">
                <template v-if="editingId === p.id">
                  <v-btn size="small" variant="text" color="primary" :loading="busy" @click="saveEdit(p)">Simpan</v-btn>
                  <v-btn size="small" variant="text" :disabled="busy" @click="editingId = null">Batal</v-btn>
                </template>
                <template v-else>
                  <v-btn icon="mdi-pencil" size="x-small" variant="text" :disabled="busy"
                    :aria-label="`Ubah nilai periode mulai ${formatDate(p.valid_from)}`" @click="startEdit(p)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" :disabled="busy || periods.length <= 1"
                    :aria-label="`Hapus periode mulai ${formatDate(p.valid_from)}`" @click="deleting = p" />
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>

        <div class="text-subtitle-2 mb-2">Tambah periode</div>
        <v-form ref="formRef" @submit.prevent="add">
          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.valid_from" label="Berlaku mulai" type="date" variant="outlined" density="comfortable"
                :rules="[(v: string) => !!v || 'Wajib diisi']" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model.number="form.factor_value" :label="`Nilai (kg CO₂e per ${factor.source_unit})`" type="number"
                min="0" step="any" variant="outlined" density="comfortable"
                :rules="[(v: number | string) => (v !== '' && v !== null && Number(v) >= 0) || 'Wajib, minimal 0']" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.source" label="Sumber" variant="outlined" density="comfortable" />
            </v-col>
          </v-row>
          <v-btn type="submit" color="primary" :loading="busy">Tambah periode</v-btn>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Tutup</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Menghapus periode menghitung ulang draft, jadi dikonfirmasi dulu -->
    <v-dialog :model-value="!!deleting" max-width="420" aria-labelledby="delete-period-title"
      @update:model-value="(open: boolean) => { if (!open) deleting = null }">
      <v-card rounded="lg">
        <v-card-title id="delete-period-title" class="pa-5 pb-2">Hapus periode?</v-card-title>
        <v-card-text>
          Periode mulai {{ deleting ? formatDate(deleting.valid_from) : '' }} dihapus. Entri draft/ditolak pada periode ini akan
          dihitung ulang dengan nilai periode sebelumnya; entri yang sudah diajukan/disetujui tidak berubah.
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="deleting = null">Batal</v-btn>
          <v-btn color="error" :loading="busy" @click="remove">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { getErrorMessage } from '@/services/api'
import { categoriesService, type PeriodChange } from '@/services/categories.service'
import { useUiStore } from '@/stores/ui.store'
import { FIRST_VALID_FROM, formatFactor, type FactorPeriod } from '@/utils/factorPeriods'
import { formatDate } from '@/utils/formatters'

const props = defineProps<{ modelValue: boolean; factor: { id: number; name: string; source_unit: string } | null }>()
// changed: nilai "saat ini" faktor bisa berubah, jadi daftar faktor perlu dimuat ulang
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; changed: [] }>()
const ui = useUiStore()

const periods = ref<FactorPeriod[]>([])
const locked = ref(0)
const loading = ref(false)
const loadError = ref(false)
const busy = ref(false)
const deleting = ref<FactorPeriod | null>(null)
const editError = ref('')
const result = ref<PeriodChange | null>(null)
const editingId = ref<number | null>(null)
const editValue = ref<number | null>(null)
const formRef = ref()
const emptyForm = () => ({ valid_from: '', factor_value: null as number | null, source: '' })
const form = ref(emptyForm())

function periodLabel(p: FactorPeriod): string {
  const from = p.valid_from === FIRST_VALID_FROM ? 'Sejak awal' : formatDate(p.valid_from)
  return `${from} – ${p.valid_until ? formatDate(p.valid_until) : 'sekarang'}`
}

const latest = useLatestRequest()

async function load() {
  if (!props.factor) return
  const ticket = latest.next()
  loading.value = true
  loadError.value = false
  try {
    const res = await categoriesService.factorValues(props.factor.id)
    if (!latest.isCurrent(ticket)) return
    periods.value = res.data
    locked.value = res.meta.locked
  } catch (e: any) {
    if (!latest.isCurrent(ticket)) return
    // Jangan tampilkan periode lama: tombol ubah/hapus akan memakai id yang tidak lagi sesuai
    periods.value = []
    loadError.value = true
    ui.showError(getErrorMessage(e, 'Gagal memuat nilai faktor.'))
  } finally {
    if (latest.isCurrent(ticket)) loading.value = false
  }
}

watch(() => [props.modelValue, props.factor?.id], ([open]) => {
  if (!open) return
  result.value = null
  editingId.value = null
  deleting.value = null
  periods.value = []
  locked.value = 0
  form.value = emptyForm()
  load()
}, { immediate: true })

// Setiap perubahan: tampilkan dampaknya, muat ulang periode, beri tahu parent
async function apply(change: () => Promise<PeriodChange>, failMessage: string) {
  busy.value = true
  try {
    result.value = await change()
    editingId.value = null
    emit('changed')
    await load()
    return true
  } catch (e: any) {
    ui.showError(getErrorMessage(e, failMessage))
    return false
  } finally {
    busy.value = false
  }
}

async function add() {
  const { valid } = await formRef.value.validate()
  if (!valid || !props.factor || form.value.factor_value === null) return
  const factorId = props.factor.id
  const payload = { valid_from: form.value.valid_from, factor_value: form.value.factor_value, source: form.value.source || null }
  if (await apply(() => categoriesService.addFactorValue(factorId, payload), 'Gagal menambah periode.')) {
    form.value = emptyForm()
    formRef.value.resetValidation()
  }
}

function startEdit(p: FactorPeriod) {
  editingId.value = p.id
  editValue.value = p.factor_value
  editError.value = ''
}

async function saveEdit(p: FactorPeriod) {
  // v-model.number memberi '' untuk isian kosong
  const value: unknown = editValue.value
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    editError.value = 'Wajib, minimal 0'
    return
  }
  editError.value = ''
  if (!props.factor) return
  const factorId = props.factor.id
  await apply(() => categoriesService.updateFactorValue(factorId, p.id, { factor_value: value }), 'Gagal mengubah nilai.')
}

async function remove() {
  const p = deleting.value
  if (!props.factor || !p) return
  const factorId = props.factor.id
  if (await apply(() => categoriesService.deleteFactorValue(factorId, p.id), 'Gagal menghapus periode.')) deleting.value = null
}
</script>
