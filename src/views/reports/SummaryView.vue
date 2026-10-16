<template>
  <v-container class="pa-6 summary-page" fluid>
    <!-- Kontrol layar; tidak ikut tercetak -->
    <div class="d-flex flex-wrap align-center ga-3 mb-6 no-print">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/reports">Kembali</v-btn>
      <v-spacer />
      <v-select v-model="year" :items="years" label="Tahun" variant="outlined" density="compact" hide-details style="max-width: 120px" />
      <v-select v-model="projectId" :items="projectOptions" label="Project" variant="outlined" density="compact" hide-details
        clearable style="min-width: 200px; max-width: 280px" />
      <v-btn color="primary" prepend-icon="mdi-printer" :disabled="loading" @click="print">Cetak / Simpan PDF</v-btn>
    </div>

    <header class="mb-6">
      <div class="text-overline text-primary">Carbon Tracker</div>
      <h1 class="text-h5 font-weight-bold">Ringkasan Emisi {{ year }}</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        {{ selectedProject ? `${selectedProject.name} (${selectedProject.code})` : 'Semua project yang dapat Anda akses' }}
        · hanya entri yang disetujui · dibuat {{ formatDateTime(generatedAt) }}
      </p>
    </header>

    <div v-if="loading" class="text-center pa-8 no-print"><v-progress-circular indeterminate aria-label="Memuat ringkasan" /></div>

    <template v-else>
      <v-row class="mb-2">
        <v-col v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" md="3">
          <div class="kpi pa-4">
            <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
            <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
            <div class="text-caption text-medium-emphasis">{{ kpi.note }}</div>
          </div>
        </v-col>
      </v-row>

      <!-- Ikut tercetak: laporan tidak boleh terlihat lengkap bila ada bagian yang gagal dimuat -->
      <v-alert v-if="failed.length" type="warning" variant="tonal" density="compact" class="mb-4">
        Sebagian data gagal dimuat: {{ failed.join(', ') }}. Muat ulang halaman sebelum mencetak.
      </v-alert>

      <section class="mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">Scope GHG</h2>
        <v-table density="compact">
          <caption class="d-sr-only">Emisi per scope GHG</caption>
          <thead><tr><th>Scope</th><th>Keterangan</th><th class="text-right">Emisi</th><th class="text-right">Entri</th><th class="text-right">%</th></tr></thead>
          <tbody>
            <tr v-if="failed.includes(SECTIONS.scopes)"><td colspan="5" class="text-medium-emphasis">Data tidak tersedia</td></tr>
            <tr v-for="s in scopes" :key="s.scope">
              <td class="text-no-wrap">Scope {{ s.scope }}</td>
              <td>{{ GHG_SCOPES[s.scope] }}</td>
              <td class="text-right text-no-wrap">{{ formatCo2(s.total_co2e_kg) }}</td>
              <td class="text-right">{{ s.entry_count }}</td>
              <td class="text-right">{{ formatNumber(s.percentage) }}</td>
            </tr>
            <tr class="font-weight-bold">
              <td colspan="2">Total</td>
              <td class="text-right text-no-wrap">{{ summary ? formatCo2(summary.total_co2e_kg) : '-' }}</td>
              <td class="text-right">{{ summary?.entry_count ?? '-' }}</td>
              <td class="text-right">{{ summary ? formatNumber(summary.total_co2e_kg ? 100 : 0) : '-' }}</td>
            </tr>
          </tbody>
        </v-table>
      </section>

      <section class="mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">Per kategori</h2>
        <v-table density="compact">
          <caption class="d-sr-only">Emisi per kategori</caption>
          <thead><tr><th>Kategori</th><th class="text-right">Emisi</th><th class="text-right">Entri</th><th class="text-right">%</th></tr></thead>
          <tbody>
            <tr v-if="!categories.length"><td colspan="4" class="text-medium-emphasis">{{ emptyText(SECTIONS.categories) }}</td></tr>
            <tr v-for="c in categories" :key="c.category_id">
              <td>{{ c.category_name }}</td>
              <td class="text-right text-no-wrap">{{ formatCo2(c.total_co2e_kg) }}</td>
              <td class="text-right">{{ c.entry_count }}</td>
              <td class="text-right">{{ formatNumber(c.percentage) }}</td>
            </tr>
          </tbody>
        </v-table>
      </section>

      <section class="mb-6 keep-together">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">Tren bulanan</h2>
        <p v-if="failed.includes(SECTIONS.trend)" class="text-body-2 text-medium-emphasis">Data tidak tersedia</p>
        <apexchart v-else type="bar" height="240" :options="trendOptions" :series="trendSeries" />
        <v-table density="compact" class="trend-table">
          <caption class="d-sr-only">Emisi per bulan</caption>
          <thead><tr><th v-for="m in trend" :key="m.month" class="text-right">{{ monthLabel(m.month) }}</th></tr></thead>
          <tbody><tr><td v-for="m in trend" :key="m.month" class="text-right">{{ formatNumber(m.total_co2e_kg, 0) }}</td></tr></tbody>
        </v-table>
        <div class="text-caption text-medium-emphasis">Dalam kg CO₂e</div>
      </section>

      <section v-if="!projectId" class="mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">Per project</h2>
        <v-table density="compact">
          <caption class="d-sr-only">Emisi per project</caption>
          <thead><tr><th>Project</th><th>Kode</th><th class="text-right">Emisi</th><th class="text-right">Entri</th><th class="text-right">Tim</th><th class="text-right">Intensitas</th></tr></thead>
          <tbody>
            <tr v-if="!projects.length"><td colspan="6" class="text-medium-emphasis">{{ emptyText(SECTIONS.projects) }}</td></tr>
            <tr v-for="p in projects" :key="p.id">
              <td>{{ p.name }}</td>
              <td>{{ p.code }}</td>
              <td class="text-right text-no-wrap">{{ formatCo2(p.total_co2e_kg) }}</td>
              <td class="text-right">{{ p.entry_count }}</td>
              <td class="text-right">{{ p.team_size ?? '-' }}</td>
              <td class="text-right text-no-wrap">{{ formatIntensity(p.intensity_kg_per_person) }}</td>
            </tr>
          </tbody>
        </v-table>
      </section>

      <section class="mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">Entri emisi terbesar</h2>
        <v-table density="compact">
          <caption class="d-sr-only">Entri emisi terbesar</caption>
          <thead><tr><th>Tanggal</th><th>Project</th><th>Faktor emisi</th><th class="text-right">Jumlah</th><th class="text-right">Emisi</th></tr></thead>
          <tbody>
            <tr v-if="!topEntries.length"><td colspan="5" class="text-medium-emphasis">{{ emptyText(SECTIONS.topEntries) }}</td></tr>
            <tr v-for="e in topEntries" :key="e.id">
              <td class="text-no-wrap">{{ formatDate(e.entry_date) }}</td>
              <td>{{ e.project_name }}</td>
              <td>{{ e.factor_name }}</td>
              <td class="text-right text-no-wrap">{{ formatNumber(e.quantity) }} {{ e.source_unit }}</td>
              <td class="text-right text-no-wrap">{{ formatCo2(e.co2e_kg) }}</td>
            </tr>
          </tbody>
        </v-table>
      </section>

      <footer class="text-caption text-medium-emphasis">
        Metode: emisi = jumlah aktivitas × faktor emisi; nilai faktor dan scope GHG disalin saat entri dicatat.
        Proyeksi memakai run-rate linear (total s.d. bulan berjalan ÷ jumlah bulan × 12) dan dibandingkan dengan
        periode yang sama tahun sebelumnya.
      </footer>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { dashboardService } from '@/services/dashboard.service'
import { useUiStore } from '@/stores/ui.store'
import { GHG_SCOPES } from '@/utils/constants'
import { formatChange, formatCo2, formatDate, formatDateTime, formatNumber, monthLabel } from '@/utils/formatters'
import { formatIntensity } from '@/utils/initiatives'
import { comparisonCaption, projectionCaption, type Outlook } from '@/utils/outlook'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const currentYear = new Date().getFullYear()
const queryNumber = (value: unknown) => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null)
// Tahun di luar rentang wajar (mis. salah ketik di URL) diganti tahun berjalan
const queryYear = (value: unknown) => {
  const y = queryNumber(value)
  return y !== null && y >= 2000 && y <= currentYear + 1 ? y : null
}

// Tahun dan project disimpan di URL supaya ringkasan bisa dibagikan atau dibuka ulang
const year = ref<number>(queryYear(route.query.year) ?? currentYear)
const projectId = ref<number | null>(queryNumber(route.query.project_id))
const years = computed(() => [...new Set([...Array.from({ length: 5 }, (_, i) => currentYear - i), year.value])].sort((a, b) => b - a))

// Nama bagian, dipakai juga di peringatan "gagal dimuat"
const SECTIONS = {
  summary: 'Total emisi',
  outlook: 'Proyeksi',
  scopes: 'Scope GHG',
  categories: 'Per kategori',
  trend: 'Tren bulanan',
  projects: 'Per project',
  topEntries: 'Entri emisi terbesar',
} as const

const loading = ref(true)
const failed = ref<string[]>([])
const generatedAt = ref(new Date().toISOString())
const summary = ref<any>(null)
const outlook = ref<Outlook | null>(null)
const scopes = ref<any[]>([])
const categories = ref<any[]>([])
const trend = ref<any[]>([])
const projects = ref<any[]>([])
const topEntries = ref<any[]>([])

const projectOptions = computed(() => projects.value.map(p => ({ title: `${p.name} (${p.code})`, value: p.id })))
const selectedProject = computed(() => projects.value.find(p => p.id === projectId.value))
const emptyText = (section: string) => (failed.value.includes(section) ? 'Data tidak tersedia' : 'Belum ada data')

const kpis = computed(() => {
  const o = outlook.value
  return [
    { label: 'Total emisi', value: summary.value ? formatCo2(summary.value.total_co2e_kg) : '-', note: summary.value?.period ?? '' },
    { label: 'Entri disetujui', value: summary.value ? String(summary.value.entry_count) : '-', note: 'Dihitung dalam ringkasan' },
    {
      label: o && o.months_elapsed >= 12 ? `Total akhir ${year.value}` : `Proyeksi akhir ${year.value}`,
      value: o?.projected_annual_co2e_kg == null ? '-' : formatCo2(o.projected_annual_co2e_kg),
      note: o ? projectionCaption(o) : 'Data tidak tersedia',
    },
    {
      label: 'Dibanding tahun lalu',
      value: o?.yoy_change_pct == null ? '-' : formatChange(o.yoy_change_pct),
      note: o ? comparisonCaption(o) : 'Data tidak tersedia',
    },
  ]
})

const trendSeries = computed(() => [{ name: 'Emisi (kg CO₂e)', data: trend.value.map(m => m.total_co2e_kg) }])
const trendOptions = computed(() => ({
  // Tanpa animasi: grafik sudah final saat dialog cetak dibuka
  chart: { toolbar: { show: false }, animations: { enabled: false } },
  colors: ['#2E7D32'],
  xaxis: { categories: trend.value.map(m => monthLabel(m.month)) },
  yaxis: { labels: { formatter: (v: number) => `${v.toFixed(0)} kg` } },
  dataLabels: { enabled: false },
}))

const latest = useLatestRequest()

async function load() {
  const ticket = latest.next()
  loading.value = true
  const filters = { period_year: year.value, ...(projectId.value ? { project_id: projectId.value } : {}) }
  const requests: [keyof typeof SECTIONS, Promise<any>][] = [
    ['summary', dashboardService.getSummary(filters)],
    ['outlook', dashboardService.getOutlook(filters)],
    ['scopes', dashboardService.getScopeBreakdown(filters)],
    ['categories', dashboardService.getCategoryBreakdown(filters)],
    ['trend', dashboardService.getTrend(filters)],
    ['projects', dashboardService.getProjects({ period_year: year.value })],
    ['topEntries', dashboardService.getTopEntries({ ...filters, limit: 10 })],
  ]
  const results = await Promise.allSettled(requests.map(([, request]) => request))
  if (!latest.isCurrent(ticket)) return

  const data: Partial<Record<keyof typeof SECTIONS, any>> = {}
  const failedNow: string[] = []
  results.forEach((result, i) => {
    const key = requests[i][0]
    if (result.status === 'fulfilled') data[key] = result.value
    else failedNow.push(SECTIONS[key])
  })
  failed.value = failedNow
  summary.value = data.summary ?? null
  outlook.value = data.outlook ?? null
  scopes.value = data.scopes ?? []
  categories.value = data.categories ?? []
  trend.value = data.trend ?? []
  projects.value = data.projects ?? []
  topEntries.value = data.topEntries ?? []
  generatedAt.value = new Date().toISOString()
  loading.value = false

  if (failedNow.length) ui.showError('Sebagian data ringkasan gagal dimuat.')

  // Project di URL yang tidak bisa diakses: kembali ke semua project (memicu muat ulang)
  if (projectId.value && data.projects && !selectedProject.value) projectId.value = null
}

function print() {
  window.print()
}

watch([year, projectId], () => {
  router.replace({ query: { year: String(year.value), ...(projectId.value ? { project_id: String(projectId.value) } : {}) } })
  load()
}, { immediate: true })

// Gaya cetak hanya aktif selama halaman ini terbuka (CSS chunk tetap termuat setelah pindah halaman)
onMounted(() => document.documentElement.classList.add('print-summary'))
onBeforeUnmount(() => {
  document.documentElement.classList.remove('print-summary')
  latest.next() // respons yang masih berjalan tidak dipakai lagi
})
</script>

<style scoped>
.summary-page {
  max-width: 1100px;
  page: summary;
}

.kpi {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  height: 100%;
}

.trend-table :deep(th),
.trend-table :deep(td) {
  padding: 0 6px !important;
}
</style>

<style>
/* Halaman cetak: hanya isi ringkasan, tanpa navigasi aplikasi. Semua aturan diawali
   html.print-summary (kelas dipasang selama halaman ini terbuka) agar tidak berlaku di halaman lain. */
@page summary {
  size: A4;
  margin: 14mm;
}

@media print {
  html.print-summary .v-navigation-drawer,
  html.print-summary .v-app-bar,
  html.print-summary .v-snackbar,
  html.print-summary .no-print {
    display: none !important;
  }

  html.print-summary .v-main {
    padding: 0 !important;
  }

  /* Latar abu-abu aplikasi tidak ikut tercetak */
  html.print-summary .v-application,
  html.print-summary .v-main {
    background: #fff !important;
  }

  html.print-summary .summary-page {
    max-width: none;
    padding: 0 !important;
  }

  html.print-summary .summary-page section,
  html.print-summary .summary-page .kpi {
    break-inside: avoid;
  }
}
</style>
