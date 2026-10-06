<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card rounded="lg">
      <v-card-title class="pa-5 pb-2">Riwayat Entri</v-card-title>
      <v-card-text>
        <div v-if="loading" class="text-center pa-6"><v-progress-circular indeterminate size="28" /></div>
        <p v-else-if="!history.length" class="text-medium-emphasis text-center pa-6">Belum ada riwayat.</p>
        <v-timeline v-else side="end" density="compact" truncate-line="both">
          <v-timeline-item v-for="h in history" :key="h.id" :dot-color="EVENTS[h.event]?.color ?? 'grey'" size="small">
            <div class="d-flex justify-space-between flex-wrap ga-2">
              <span class="font-weight-bold">{{ EVENTS[h.event]?.label ?? h.event }}</span>
              <span class="text-caption text-medium-emphasis">{{ formatDateTime(h.created_at) }}</span>
            </div>
            <div class="text-caption text-medium-emphasis mb-1">oleh {{ h.user?.name ?? 'Sistem' }}</div>
            <ul v-if="visibleChanges(h).length" class="text-body-2 pl-4">
              <li v-for="c in visibleChanges(h)" :key="c.field">
                {{ c.label }}: <span class="text-medium-emphasis">{{ c.old }}</span> → <strong>{{ c.new }}</strong>
              </li>
            </ul>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { entriesService } from '@/services/entries.service'
import { getErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/ui.store'
import { ENTRY_STATUS_LABELS } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'

const props = defineProps<{ modelValue: boolean; projectId: number; entryId: number | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const EVENTS: Record<string, { label: string; color: string }> = {
  created: { label: 'Dibuat', color: 'blue' },
  updated: { label: 'Diubah', color: 'grey' },
  submitted: { label: 'Di-submit', color: 'orange' },
  approved: { label: 'Disetujui', color: 'green' },
  rejected: { label: 'Ditolak', color: 'red' },
  deleted: { label: 'Dihapus', color: 'grey-darken-2' },
}

// Hanya field yang bermakna bagi user; field teknis (period_*, category_id, dsb.) tidak ditampilkan
const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  quantity: 'Jumlah',
  entry_date: 'Tanggal',
  co2e_kg: 'Emisi (kg CO₂e)',
  emission_factor_id: 'Faktor emisi (ID)',
  description: 'Keterangan',
  vendor_name: 'Vendor',
  activity_type: 'Tipe aktivitas',
  rejection_reason: 'Alasan penolakan',
}

const ui = useUiStore()
const history = ref<any[]>([])
const loading = ref(false)

function display(field: string, value: any): string {
  if (value === null || value === undefined || value === '') return '-'
  if (field === 'status') return ENTRY_STATUS_LABELS[value] ?? value
  if (field === 'entry_date') return String(value).slice(0, 10)
  if (field === 'quantity' || field === 'co2e_kg') return String(Number(value))
  return String(value)
}

function visibleChanges(h: any) {
  return Object.entries(h.changes ?? {})
    .filter(([field]) => FIELD_LABELS[field])
    .map(([field, c]: [string, any]) => ({ field, label: FIELD_LABELS[field], old: display(field, c.old), new: display(field, c.new) }))
}

watch(() => [props.modelValue, props.entryId], async ([open]) => {
  if (!open || props.entryId === null) return
  loading.value = true
  history.value = []
  try {
    history.value = await entriesService.history(props.projectId, props.entryId)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal memuat riwayat entri.'))
  } finally { loading.value = false }
})
</script>
