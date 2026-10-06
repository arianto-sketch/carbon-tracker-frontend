<template>
  <v-container class="pa-6" fluid>
    <h1 class="text-h5 font-weight-bold mb-6">Laporan</h1>

    <v-row>
      <v-col cols="12" md="5">
        <v-card rounded="lg" elevation="1">
          <v-card-title class="pa-5 pb-2 text-body-1 font-weight-bold">Generate Laporan Baru</v-card-title>
          <v-card-text class="pa-5">
            <v-text-field v-model.number="form.period_year" label="Tahun" type="number" variant="outlined" density="comfortable" class="mb-3" />
            <v-row dense>
              <v-col cols="6">
                <v-text-field v-model.number="form.period_month_from" label="Bulan Dari (1-12)" type="number" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="form.period_month_to" label="Bulan Sampai (1-12)" type="number" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>
            <v-select v-model="form.format" :items="['xlsx','csv']" label="Format" variant="outlined" density="comfortable" class="mb-3" />
            <v-btn color="primary" block :loading="generating" @click="generate">
              <v-icon start>mdi-file-export</v-icon> Generate Laporan
            </v-btn>

            <v-alert v-if="activeJob" class="mt-4" :type="activeJob.status === 'done' ? 'success' : activeJob.status === 'failed' ? 'error' : 'info'" variant="tonal" density="compact">
              <template v-if="activeJob.status === 'done'">
                Laporan siap!
                <v-btn size="small" variant="text" color="primary" :loading="downloadingId === activeJob.job_id"
                  @click="download(activeJob.job_id, activeJob.format, activeJob.file_name)">Download</v-btn>
              </template>
              <template v-else-if="activeJob.status === 'failed'">Gagal: {{ activeJob.error }}</template>
              <template v-else>Sedang diproses... <v-progress-circular size="16" width="2" indeterminate class="ml-2" /></template>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card rounded="lg" elevation="1">
          <v-card-title class="pa-5 pb-2 text-body-1 font-weight-bold">Riwayat Laporan</v-card-title>
          <v-table density="compact">
            <thead><tr><th>Dibuat</th><th>Format</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              <tr v-if="!history.length"><td colspan="4" class="text-center pa-4 text-medium-emphasis">Belum ada laporan</td></tr>
              <tr v-for="j in history" :key="j.job_id">
                <td>{{ formatDate(j.created_at) }}</td>
                <td><v-chip size="x-small">{{ j.format }}</v-chip></td>
                <td><v-chip :color="j.status === 'done' ? 'green' : j.status === 'failed' ? 'red' : 'orange'" size="x-small" variant="tonal">{{ j.status }}</v-chip></td>
                <td>
                  <v-btn v-if="j.status === 'done'" icon="mdi-download" size="x-small" variant="text"
                    :loading="downloadingId === j.job_id" @click="download(j.job_id, j.format, j.file_name)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { reportsService } from '@/services/reports.service'
import { saveFile } from '@/services/download'
import { getErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/ui.store'
import { formatDate } from '@/utils/formatters'

const ui = useUiStore()
const generating = ref(false)
const activeJob = ref<any>(null)
const history = ref<any[]>([])
const downloadingId = ref<number | null>(null)
const form = ref({ period_year: new Date().getFullYear(), period_month_from: 1, period_month_to: 12, format: 'xlsx' })

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollingJobId: number | null = null
let unmounted = false

async function generate() {
  generating.value = true
  try {
    const job = await reportsService.generate(form.value)
    activeJob.value = { ...job, status: 'pending', format: form.value.format }
    pollStatus(job.job_id)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal generate laporan.'))
  } finally { generating.value = false }
}

function stopPolling() {
  if (pollTimer !== null) clearTimeout(pollTimer)
  pollTimer = null
  pollingJobId = null
}

// Polling berantai (setTimeout) agar request tidak tumpang tindih; generate baru membatalkan polling lama.
function pollStatus(jobId: number) {
  stopPolling()
  if (unmounted) return
  pollingJobId = jobId
  const tick = async () => {
    try {
      const status = await reportsService.getStatus(jobId)
      if (pollingJobId !== jobId) return
      activeJob.value = { ...activeJob.value, ...status }
      if (status.status === 'done' || status.status === 'failed') {
        stopPolling()
        await loadHistory()
        return
      }
      pollTimer = setTimeout(tick, 3000)
    } catch (e: any) {
      if (pollingJobId !== jobId) return
      stopPolling()
      ui.showError(getErrorMessage(e, 'Gagal memeriksa status laporan.'))
    }
  }
  pollTimer = setTimeout(tick, 3000)
}

async function download(jobId: number, format?: string, fileName?: string | null) {
  downloadingId.value = jobId
  try {
    const { blob, filename } = await reportsService.download(jobId, format, fileName)
    saveFile(blob, filename)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengunduh laporan.'))
  } finally {
    downloadingId.value = null
  }
}

async function loadHistory() {
  try {
    const res = await reportsService.getHistory()
    history.value = res.data
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal memuat riwayat laporan.'))
  }
}

onMounted(loadHistory)
onUnmounted(() => {
  unmounted = true
  stopPolling()
})
</script>
