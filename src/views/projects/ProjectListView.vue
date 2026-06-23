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
          <v-empty-state icon="mdi-folder-open" title="Belum ada project" subtitle="Klik tombol 'Project Baru' untuk mulai." />
        </v-col>
        <v-col v-for="p in filteredProjects" :key="p.id" cols="12" md="6" lg="4">
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
            </v-card-text>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <!-- Create Dialog -->
    <v-dialog v-model="dialog" max-width="540">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-2">Project Baru</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="createProject">
            <v-row dense>
              <v-col cols="8">
                <v-text-field v-model="form.name" label="Nama Project" variant="outlined" density="comfortable"
                  :rules="[v => !!v || 'Wajib diisi']" />
              </v-col>
              <v-col cols="4">
                <v-text-field v-model="form.code" label="Kode" variant="outlined" density="comfortable"
                  :rules="[v => !!v || 'Wajib diisi']" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="form.client_name" label="Nama Client" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.start_date" label="Tanggal Mulai" type="date" variant="outlined" density="comfortable"
                  :rules="[v => !!v || 'Wajib diisi']" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.end_date" label="Tanggal Selesai" type="date" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="createProject">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { projectsService } from '@/services/projects.service'
import { dashboardService } from '@/services/dashboard.service'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2, formatDate } from '@/utils/formatters'
import { PROJECT_STATUS_COLORS } from '@/utils/constants'

const ui = useUiStore()
const projects = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const search = ref('')
const formRef = ref()
const form = ref({ name: '', code: '', client_name: '', start_date: '', end_date: '' })

const filteredProjects = computed(() =>
  projects.value.filter(p => p.name.toLowerCase().includes(search.value?.toLowerCase() ?? ''))
)

function statusColor(status: string) {
  return PROJECT_STATUS_COLORS[status] ?? 'grey'
}

async function load() {
  loading.value = true
  try {
    const [pRes, dRes] = await Promise.all([
      projectsService.list(),
      dashboardService.getProjects(),
    ])
    const emissionMap = Object.fromEntries(dRes.map((d: any) => [d.id, d.total_co2e_kg]))
    projects.value = pRes.data.map((p: any) => ({ ...p, total_co2e_kg: emissionMap[p.id] ?? 0 }))
  } finally {
    loading.value = false
  }
}

async function createProject() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await projectsService.create(form.value)
    ui.showSnackbar('Project berhasil dibuat.')
    dialog.value = false
    form.value = { name: '', code: '', client_name: '', start_date: '', end_date: '' }
    await load()
  } catch (e: any) {
    ui.showError(e.response?.data?.message ?? 'Gagal membuat project.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
