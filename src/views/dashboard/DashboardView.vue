<template>
  <v-container class="pa-6" fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Dashboard</h1>
        <p class="text-body-2 text-medium-emphasis">Ringkasan emisi karbon seluruh project</p>
      </div>
      <v-select
        v-model="selectedYear"
        :items="years"
        label="Tahun"
        density="compact"
        variant="outlined"
        style="max-width: 120px"
        @update:model-value="load"
      />
    </div>

    <!-- Summary Cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <div class="text-body-2 mb-1 opacity-80">Total Emisi</div>
            <div class="text-h5 font-weight-bold">{{ formatCo2(store.summary?.total_co2e_kg ?? 0) }}</div>
            <div class="text-caption opacity-70">{{ store.summary?.period }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="green-lighten-4" variant="flat" rounded="lg">
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-1">Total Entri</div>
            <div class="text-h5 font-weight-bold text-green-darken-3">{{ store.summary?.entry_count ?? 0 }}</div>
            <div class="text-caption text-medium-emphasis">Entri disetujui</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="orange-lighten-4" variant="flat" rounded="lg">
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-1">Project Aktif</div>
            <div class="text-h5 font-weight-bold text-orange-darken-3">
              {{ store.projects.filter(p => p.status === 'active').length }}
            </div>
            <div class="text-caption text-medium-emphasis">Dari {{ store.projects.length }} project</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="blue-lighten-4" variant="flat" rounded="lg">
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-1">Top Kategori</div>
            <div class="text-h6 font-weight-bold text-blue-darken-3">
              {{ store.categoryBreakdown[0]?.category_name ?? '-' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatCo2(store.categoryBreakdown[0]?.total_co2e_kg ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Peringatan Target -->
    <v-card rounded="lg" elevation="1" class="mb-6">
      <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2 d-flex align-center">
        <v-icon class="mr-2" :color="store.targetAlerts.length ? 'warning' : 'success'" size="small">
          {{ store.targetAlerts.length ? 'mdi-alert' : 'mdi-check-circle' }}
        </v-icon>
        Peringatan Target {{ new Date().getFullYear() }}
      </v-card-title>
      <v-card-text>
        <p v-if="!store.targetAlerts.length" class="text-body-2 text-medium-emphasis mb-0">
          Semua target aman — tidak ada target dengan pemakaian di atas 80%.
        </p>
        <v-list v-else density="compact" class="py-0">
          <v-list-item v-for="a in store.targetAlerts" :key="a.target_id" :to="`/projects/${a.project_id}`" class="px-0">
            <template #prepend>
              <v-chip :color="a.level === 'exceeded' ? 'error' : 'warning'" size="small" variant="flat" class="mr-3">
                {{ a.percentage_used.toFixed(1) }}%
              </v-chip>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">{{ a.project_name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ a.category }} · {{ PERIOD_LABELS[a.period_type] ?? a.period_type }}{{ a.period_value ? ` ${a.period_value}` : '' }} ·
              {{ formatCo2(a.actual_co2e_kg) }} dari {{ formatCo2(a.target_co2e_kg) }}
              <strong v-if="a.level === 'exceeded'" class="text-error"> — melebihi target</strong>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-row>
      <!-- Trend Chart -->
      <v-col cols="12" md="8">
        <v-card rounded="lg" elevation="1">
          <v-card-title class="text-body-1 font-weight-bold pa-4 pb-0">Tren Emisi Bulanan</v-card-title>
          <v-card-text>
            <apexchart
              type="area"
              height="280"
              :options="trendChartOptions"
              :series="trendSeries"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Category Pie -->
      <v-col cols="12" md="4">
        <v-card rounded="lg" elevation="1">
          <v-card-title class="text-body-1 font-weight-bold pa-4 pb-0">Breakdown Kategori</v-card-title>
          <v-card-text>
            <apexchart
              v-if="store.categoryBreakdown.length"
              type="donut"
              height="280"
              :options="pieOptions"
              :series="pieSeries"
            />
            <v-empty-state v-else icon="mdi-chart-pie" title="Belum ada data" />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Entries -->
      <v-col cols="12">
        <v-card rounded="lg" elevation="1">
          <v-card-title class="text-body-1 font-weight-bold pa-4 pb-0">Top 5 Entri Emisi Terbesar</v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Project</th><th>Kategori</th><th>Faktor Emisi</th>
                <th>Tanggal</th><th class="text-right">Emisi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.topEntries.length">
                <td colspan="5" class="text-center text-medium-emphasis pa-4">Belum ada data</td>
              </tr>
              <tr v-for="e in store.topEntries" :key="e.id">
                <td>{{ e.project_name }}</td>
                <td>{{ e.category_name }}</td>
                <td>{{ e.factor_name }}</td>
                <td>{{ formatDate(e.entry_date) }}</td>
                <td class="text-right font-weight-bold text-primary">{{ formatCo2(e.co2e_kg) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard.store'
import { formatCo2, formatDate, monthLabel } from '@/utils/formatters'
import { PERIOD_LABELS } from '@/utils/constants'

const store = useDashboardStore()
const selectedYear = ref(new Date().getFullYear())
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const trendSeries = computed(() => [{
  name: 'Emisi (kg CO₂e)',
  data: store.trendData.map(d => d.total_co2e_kg),
}])

const trendChartOptions = computed(() => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  colors: ['#2E7D32'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: { categories: store.trendData.map(d => monthLabel(d.month)) },
  yaxis: { labels: { formatter: (v: number) => `${v.toFixed(0)} kg` } },
  dataLabels: { enabled: false },
  tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)} kg CO₂e` } },
}))

const pieSeries = computed(() => store.categoryBreakdown.map(c => c.total_co2e_kg))
const pieOptions = computed(() => ({
  labels: store.categoryBreakdown.map(c => c.category_name),
  colors: ['#2E7D32', '#F57C00', '#0288D1'],
  legend: { position: 'bottom' },
  dataLabels: { formatter: (_: any, opts: any) => `${opts.w.globals.series[opts.seriesIndex].toFixed(1)} kg` },
}))

function load() {
  store.fetchDashboard({ period_year: selectedYear.value })
}

onMounted(load)
</script>
