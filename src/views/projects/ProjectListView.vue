<template>
  <v-container class="pa-6" fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Projects</h1>
        <p class="text-body-2 text-medium-emphasis">Kelola project dan tracking emisi</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="dialog = true">Project Baru</v-btn>
    </div>

    <v-text-field
      v-model="search"
      placeholder="Cari project..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      clearable
      class="mb-4"
      style="max-width: 360px"
    />

    <v-row>
      <v-col v-if="loading" cols="12" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
      <template v-else>
        <v-col v-if="!projects.length" cols="12">
          <EmptyState v-if="search" icon="mdi-magnify" title="Project tidak ditemukan" text="Tidak ada project yang cocok dengan pencarian." />
          <EmptyState v-else icon="mdi-folder-open" title="Belum ada project" text="Klik tombol 'Project Baru' untuk mulai." />
        </v-col>
        <v-col v-for="p in projects" :key="p.id" cols="12" md="6" lg="4">
          <v-card rounded="lg" elevation="1" hover :to="`/projects/${p.id}`">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-2">
                <v-chip :color="statusColor(p.status)" size="small" variant="tonal">{{ p.status }}</v-chip>
                <span class="text-caption text-medium-emphasis">{{ p.code }}</span>
              </div>
              <h3 class="text-body-1 font-weight-bold">{{ p.name }}</h3>
              <p class="text-body-2 text-medium-emphasis mt-1">{{ p.client_name ?? 'Tidak ada client' }}</p>
              <div class="d-flex align-center mt-3 text-caption text-medium-emphasis">
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                {{ formatDate(p.start_date) }} — {{ p.end_date ? formatDate(p.end_date) : 'Ongoing' }}
              </div>
              <div class="text-right mt-2 font-weight-bold text-primary">
                {{ formatCo2(p.total_co2e_kg ?? 0) }}
              </div>
              <div v-if="p.intensity_kg_per_person != null" class="text-right text-caption text-medium-emphasis">
                {{ formatIntensity(p.intensity_kg_per_person) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>
    </v-row>
    <ListPagination v-model="page" :meta="meta" />

    <ProjectFormDialog v-model="dialog" @saved="load" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import ListPagination from '@/components/ListPagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import ProjectFormDialog from '@/components/ProjectFormDialog.vue'
import { useLatestRequest } from '@/composables/useLatestRequest'
import { usePageQuery } from '@/composables/usePageQuery'
import { projectsService } from '@/services/projects.service'
import { dashboardService } from '@/services/dashboard.service'
import { formatCo2, formatDate } from '@/utils/formatters'
import { formatIntensity } from '@/utils/initiatives'
import { PROJECT_STATUS_COLORS } from '@/utils/constants'

const projects = ref<any[]>([])
const meta = ref<any>(null)
const page = usePageQuery()
const loading = ref(false)
const dialog = ref(false)
const search = ref('')


function statusColor(status: string) {
  return PROJECT_STATUS_COLORS[status] ?? 'grey'
}

const latest = useLatestRequest()

async function load() {
  const ticket = latest.next()
  loading.value = true
  try {
    const [pRes, dRes] = await Promise.all([
      projectsService.list({ page: page.value, ...(search.value ? { search: search.value } : {}) }),
      dashboardService.getProjects(),
    ])
    if (!latest.isCurrent(ticket)) return
    const emissionMap = Object.fromEntries(dRes.map((d: any) => [d.id, d]))
    projects.value = pRes.data.map((p: any) => ({
      ...p,
      total_co2e_kg: emissionMap[p.id]?.total_co2e_kg ?? 0,
      intensity_kg_per_person: emissionMap[p.id]?.intensity_kg_per_person ?? null,
    }))
    meta.value = pRes.meta
  } finally {
    if (latest.isCurrent(ticket)) loading.value = false
  }
}

// Pencarian di server (debounce); filter berubah -> kembali ke halaman 1
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { if (page.value === 1) load(); else page.value = 1 }, 300)
})
watch(page, load)

onMounted(load)
onUnmounted(() => clearTimeout(searchTimer))
</script>
