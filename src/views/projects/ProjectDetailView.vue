<template>
  <v-container class="pa-6" fluid>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/projects" class="mb-4">Kembali</v-btn>

    <div v-if="loading" class="text-center pa-8"><v-progress-circular indeterminate color="primary" /></div>
    <template v-else-if="project">
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="d-flex align-center gap-2 mb-1">
            <v-chip :color="statusColor(project.status)" size="small" variant="tonal">{{ project.status }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ project.code }}</span>
          </div>
          <h1 class="text-h5 font-weight-bold">{{ project.name }}</h1>
          <p class="text-body-2 text-medium-emphasis">{{ project.client_name }}</p>
        </div>
        <div class="text-right">
          <div class="text-h6 font-weight-bold text-primary">{{ formatCo2(summary?.total_co2e_kg ?? 0) }}</div>
          <div class="text-caption text-medium-emphasis">Total emisi disetujui</div>
        </div>
      </div>

      <v-tabs v-model="tab" color="primary" class="mb-4">
        <v-tab value="entries">Entri Emisi</v-tab>
        <v-tab value="targets">Target</v-tab>
        <v-tab value="members">Anggota</v-tab>
        <v-tab value="summary">Ringkasan</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- ENTRIES TAB -->
        <v-window-item value="entries">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-select v-model="entryStatus" :items="statusOptions" label="Status" density="compact" variant="outlined"
              style="max-width:200px" @update:model-value="loadEntries" />
            <v-btn color="primary" prepend-icon="mdi-plus" :to="`/projects/${id}/entries/new`">Tambah Entri</v-btn>
          </div>
          <v-table density="compact">
            <thead><tr>
              <th>Tanggal</th><th>Kategori</th><th>Faktor Emisi</th>
              <th>Jumlah</th><th>Emisi</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              <tr v-if="!entries.length"><td colspan="7" class="text-center pa-4 text-medium-emphasis">Belum ada entri</td></tr>
              <tr v-for="e in entries" :key="e.id">
                <td>{{ formatDate(e.entry_date) }}</td>
                <td>{{ e.category?.name }}</td>
                <td>{{ e.emission_factor?.name }}</td>
                <td>{{ e.quantity }} {{ e.source_unit }}</td>
                <td class="font-weight-bold text-primary">{{ formatCo2(e.co2e_kg) }}</td>
                <td><v-chip :color="statusColor2(e.status)" size="x-small" variant="tonal">{{ e.status }}</v-chip></td>
                <td>
                  <v-btn v-if="e.status === 'draft'" icon="mdi-pencil" size="x-small" variant="text" :to="`/projects/${id}/entries/${e.id}/edit`" />
                  <v-btn v-if="e.status === 'draft'" icon="mdi-send" size="x-small" variant="text" @click="submitEntry(e.id)" />
                  <v-btn v-if="e.status === 'submitted' && authStore.isAdmin" icon="mdi-check" size="x-small" variant="text" color="green" @click="approveEntry(e.id)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-window-item>

        <!-- TARGETS TAB -->
        <v-window-item value="targets">
          <div class="d-flex justify-end mb-3">
            <v-btn color="primary" prepend-icon="mdi-plus" :to="`/projects/${id}/targets/new`">Tambah Target</v-btn>
          </div>
          <v-row>
            <v-col v-for="t in targets" :key="t.id" cols="12" md="6">
              <v-card rounded="lg" elevation="1">
                <v-card-text>
                  <div class="d-flex justify-space-between mb-2">
                    <span class="font-weight-bold">{{ t.category?.name ?? 'Semua Kategori' }}</span>
                    <span class="text-caption">{{ t.period_type }} {{ t.period_year }}</span>
                  </div>
                  <v-progress-linear
                    :model-value="progress(t)"
                    :color="progress(t) > 100 ? 'error' : 'primary'"
                    height="8" rounded
                  />
                  <div class="d-flex justify-space-between mt-1 text-caption">
                    <span>Target: {{ formatCo2(t.target_co2e_kg) }}</span>
                    <span :class="progress(t) > 100 ? 'text-error' : ''">{{ progress(t).toFixed(1) }}%</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- MEMBERS TAB -->
        <v-window-item value="members">
          <v-list>
            <v-list-item v-for="m in members" :key="m.id" :subtitle="m.role">
              <template #prepend><v-avatar color="primary" size="36"><span class="text-white">{{ m.user?.name?.[0] }}</span></v-avatar></template>
              <template #title>{{ m.user?.name }}</template>
            </v-list-item>
          </v-list>
        </v-window-item>

        <!-- SUMMARY TAB -->
        <v-window-item value="summary">
          <v-row>
            <v-col v-for="cat in summary?.by_category" :key="cat.category_id" cols="12" md="4">
              <v-card rounded="lg" elevation="1">
                <v-card-text>
                  <div class="text-body-2 text-medium-emphasis mb-1">{{ cat.category_name }}</div>
                  <div class="text-h6 font-weight-bold text-primary">{{ formatCo2(cat.total_co2e_kg) }}</div>
                  <div class="text-caption text-medium-emphasis">{{ cat.count }} entri</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { projectsService } from '@/services/projects.service'
import { entriesService } from '@/services/entries.service'
import { targetsService } from '@/services/targets.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2, formatDate } from '@/utils/formatters'
import { ENTRY_STATUS_COLORS, PROJECT_STATUS_COLORS } from '@/utils/constants'

const route = useRoute()
const id = Number(route.params.id)
const authStore = useAuthStore()
const ui = useUiStore()

const project = ref<any>(null)
const summary = ref<any>(null)
const entries = ref<any[]>([])
const targets = ref<any[]>([])
const members = ref<any[]>([])
const loading = ref(true)
const tab = ref('entries')
const entryStatus = ref('')
const statusOptions = [
  { title: 'Semua', value: '' },
  { title: 'Draft', value: 'draft' },
  { title: 'Submitted', value: 'submitted' },
  { title: 'Approved', value: 'approved' },
]

function statusColor(s: string) { return PROJECT_STATUS_COLORS[s] ?? 'grey' }
function statusColor2(s: string) { return ENTRY_STATUS_COLORS[s] ?? 'grey' }
function progress(t: any) {
  const actual = t.actual_co2e_kg ?? 0
  return t.target_co2e_kg > 0 ? (actual / t.target_co2e_kg) * 100 : 0
}

async function loadEntries() {
  const params: any = {}
  if (entryStatus.value) params.status = entryStatus.value
  const res = await entriesService.list(id, params)
  entries.value = res.data
}

async function submitEntry(entryId: number) {
  try {
    await entriesService.submit(id, entryId)
    ui.showSnackbar('Entry berhasil di-submit.')
    await loadEntries()
  } catch { ui.showError('Gagal submit entry.') }
}

async function approveEntry(entryId: number) {
  try {
    await entriesService.approve(id, entryId)
    ui.showSnackbar('Entry berhasil di-approve.')
    await loadEntries()
  } catch { ui.showError('Gagal approve entry.') }
}

onMounted(async () => {
  try {
    const [proj, sum, mem, tgt] = await Promise.all([
      projectsService.get(id),
      projectsService.getSummary(id),
      projectsService.getMembers(id),
      targetsService.list(id),
    ])
    project.value = proj
    summary.value = sum
    members.value = mem
    targets.value = tgt
    await loadEntries()
  } finally {
    loading.value = false
  }
})
</script>
