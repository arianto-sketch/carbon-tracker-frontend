<template>
  <v-dialog :model-value="modelValue" max-width="900" scrollable @update:model-value="close">
    <v-card rounded="lg">
      <v-card-title class="pa-5 pb-2">Import Entri dari Excel/CSV</v-card-title>
      <v-card-text>
        <ol class="text-body-2 pl-4 mb-4">
          <li>
            Unduh template, isi satu baris per aktivitas. Kode faktor ada di sheet "Kode Faktor".
            <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-download" :loading="downloading"
              @click="downloadTemplate">Unduh Template</v-btn>
          </li>
          <li>Unggah file (.xlsx/.csv, maks 2 MB, 500 baris), periksa pratinjau, lalu simpan baris yang valid sebagai draft.</li>
        </ol>

        <div class="d-flex ga-2 align-start mb-4">
          <v-file-input v-model="file" label="File import" accept=".xlsx,.csv" variant="outlined" density="comfortable"
            prepend-icon="" prepend-inner-icon="mdi-file-excel" show-size hide-details />
          <v-btn color="primary" variant="tonal" class="mt-1" :disabled="!selectedFile" :loading="previewing" @click="runPreview">
            Pratinjau
          </v-btn>
        </div>

        <template v-if="preview">
          <v-alert :type="preview.invalid_count ? 'warning' : 'success'" variant="tonal" density="compact" class="mb-3">
            {{ preview.valid_count }} baris valid<span v-if="preview.invalid_count">, {{ preview.invalid_count }} baris bermasalah (tidak ikut disimpan)</span>.
          </v-alert>
          <v-table density="compact">
            <thead><tr>
              <th>Baris</th><th>Tanggal</th><th>Faktor</th><th>Jumlah</th><th>Emisi</th><th>Status</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in preview.rows" :key="r.row">
                <td>{{ r.row }}</td>
                <td>{{ r.values.entry_date ?? '-' }}</td>
                <td>{{ r.values.factor_name ?? '-' }}</td>
                <td>{{ r.values.quantity ?? '-' }} {{ r.values.source_unit ?? '' }}</td>
                <td>{{ r.values.co2e_kg != null ? formatCo2(r.values.co2e_kg) : '-' }}</td>
                <td>
                  <v-chip v-if="!r.errors.length" color="green" size="x-small" variant="tonal">Valid</v-chip>
                  <div v-else class="text-caption text-error">{{ r.errors.join(' ') }}</div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="close(false)">Batal</v-btn>
        <v-btn color="primary" :disabled="!validRows.length" :loading="saving" @click="commit">
          Simpan {{ validRows.length }} baris valid
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { entriesService } from '@/services/entries.service'
import { getErrorMessage } from '@/services/api'
import { saveFile } from '@/services/download'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2 } from '@/utils/formatters'

const props = defineProps<{ modelValue: boolean; projectId: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; imported: [count: number] }>()

const ui = useUiStore()
const file = ref<File | File[] | null>(null)
const preview = ref<any>(null)
const previewing = ref(false)
const saving = ref(false)
const downloading = ref(false)

const selectedFile = computed<File | null>(() => (Array.isArray(file.value) ? file.value[0] ?? null : file.value))
const validRows = computed(() => (preview.value?.rows ?? []).filter((r: any) => !r.errors.length))

function close(value = false) {
  if (value) return
  emit('update:modelValue', false)
  file.value = null
  preview.value = null
}

async function downloadTemplate() {
  downloading.value = true
  try {
    const { blob, filename } = await entriesService.importTemplate(props.projectId)
    saveFile(blob, filename)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengunduh template.'))
  } finally { downloading.value = false }
}

async function runPreview() {
  if (!selectedFile.value) return
  previewing.value = true
  preview.value = null
  try {
    preview.value = await entriesService.importPreview(props.projectId, selectedFile.value)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal membaca file import.'))
  } finally { previewing.value = false }
}

async function commit() {
  saving.value = true
  try {
    const rows = validRows.value.map((r: any) => ({
      entry_date: r.values.entry_date,
      emission_factor_id: r.values.emission_factor_id,
      quantity: r.values.quantity,
      description: r.values.description,
      vendor_name: r.values.vendor_name,
      activity_type: r.values.activity_type,
    }))
    const result = await entriesService.importCommit(props.projectId, rows)
    ui.showSnackbar(`${result.created} entri berhasil diimport sebagai draft.`)
    emit('imported', result.created)
    close(false)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menyimpan import.'))
  } finally { saving.value = false }
}
</script>
