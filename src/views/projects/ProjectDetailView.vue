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
              style="max-width:200px" @update:model-value="onStatusFilter" />
            <div v-if="canWrite" class="d-flex ga-2">
              <v-btn variant="tonal" prepend-icon="mdi-file-import" @click="importDialog = true">Import</v-btn>
              <v-btn color="primary" prepend-icon="mdi-plus" :to="`/projects/${id}/entries/new`">Tambah Entri</v-btn>
            </div>
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
                <td>
                  <v-chip :color="statusColor2(e.status)" size="x-small" variant="tonal">{{ ENTRY_STATUS_LABELS[e.status] ?? e.status }}</v-chip>
                  <div v-if="e.status === 'rejected' && e.rejection_reason" class="text-caption text-error mt-1" style="max-width:240px">
                    Alasan: {{ e.rejection_reason }}
                  </div>
                </td>
                <td>
                  <v-btn v-if="isEditable(e) && canWrite" icon="mdi-pencil" size="x-small" variant="text" :to="`/projects/${id}/entries/${e.id}/edit`" />
                  <v-btn v-if="isEditable(e) && canWrite" icon="mdi-send" size="x-small" variant="text" @click="submitEntry(e.id)" />
                  <v-btn v-if="e.status === 'submitted' && canApprove(e)" icon="mdi-check" size="x-small" variant="text" color="green" aria-label="Approve entri" @click="approveEntry(e.id)" />
                  <v-btn v-if="e.status === 'submitted' && canApprove(e)" icon="mdi-close-circle" size="x-small" variant="text" color="error" aria-label="Tolak entri" @click="openReject(e)" />
                  <v-btn icon="mdi-history" size="x-small" variant="text" aria-label="Riwayat entri" @click="openHistory(e.id)" />
                  <v-btn v-if="e.has_attachment" icon="mdi-paperclip" size="x-small" variant="text"
                    :aria-label="`Unduh lampiran ${e.attachment_name}`" @click="downloadAttachment(e)" />
                </td>
              </tr>
            </tbody>
          </v-table>
          <ListPagination v-model="entryPage" :meta="entriesMeta" />
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
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="font-weight-bold">{{ t.category?.name ?? 'Semua Kategori' }}</span>
                    <div class="d-flex align-center">
                      <span class="text-caption">{{ t.period_type }} {{ t.period_year }}</span>
                      <v-btn icon="mdi-pencil" size="x-small" variant="text" class="ml-1"
                        :to="`/projects/${id}/targets/${t.id}/edit`" aria-label="Edit target" />
                    </div>
                  </div>
                  <v-progress-linear
                    :model-value="progress(t)"
                    :color="isExceeded(t) ? 'error' : 'primary'"
                    height="8" rounded
                  />
                  <div class="d-flex justify-space-between mt-1 text-caption">
                    <span>Aktual: {{ formatCo2(actual(t)) }} / Target: {{ formatCo2(t.target_co2e_kg) }}</span>
                    <span :class="isExceeded(t) ? 'text-error font-weight-bold' : ''">
                      {{ progress(t).toFixed(1) }}%<template v-if="isExceeded(t)"> (melebihi target)</template>
                    </span>
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

    <EntryHistoryDialog v-model="historyDialog" :project-id="id" :entry-id="historyEntryId" />
    <ImportEntriesDialog v-model="importDialog" :project-id="id" @imported="loadEntries" />

    <v-dialog v-model="rejectDialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-2">Tolak Entri</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">Entri dikembalikan ke pembuatnya untuk diperbaiki. Jelaskan apa yang perlu diubah.</p>
          <v-form ref="rejectFormRef">
            <v-textarea v-model="rejectReason" label="Alasan penolakan" variant="outlined" rows="3" counter="500"
              :rules="[(v: string) => !!v?.trim() || 'Alasan wajib diisi', (v: string) => (v?.length ?? 0) <= 500 || 'Maksimal 500 karakter']" />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Batal</v-btn>
          <v-btn color="error" :loading="rejecting" @click="confirmReject">Tolak</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { projectsService } from '@/services/projects.service'
import { entriesService } from '@/services/entries.service'
import { targetsService } from '@/services/targets.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2, formatDate } from '@/utils/formatters'
import { getErrorMessage } from '@/services/api'
import EntryHistoryDialog from '@/components/EntryHistoryDialog.vue'
import ImportEntriesDialog from '@/components/ImportEntriesDialog.vue'
import ListPagination from '@/components/ListPagination.vue'
import { usePageQuery } from '@/composables/usePageQuery'
import { saveFile } from '@/services/download'
import { ENTRY_STATUS_COLORS, ENTRY_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/utils/constants'

const route = useRoute()
const id = Number(route.params.id)
const authStore = useAuthStore()
const ui = useUiStore()

const project = ref<any>(null)
const summary = ref<any>(null)
const entries = ref<any[]>([])
const targets = ref<any[]>([])
const targetProgress = ref<Record<number, any>>({})
const members = ref<any[]>([])
const loading = ref(true)
const tab = ref('entries')
const entryStatus = ref('')
const statusOptions = [
  { title: 'Semua', value: '' },
  ...Object.entries(ENTRY_STATUS_LABELS).map(([value, title]) => ({ title, value })),
]

// Aturan sama dengan backend: viewer (project maupun global) hanya bisa membaca;
// approve oleh owner/admin, tapi tidak untuk entri buatan sendiri.
const myProjectRole = computed(() => project.value?.current_user_role ?? null)
const canWrite = computed(() =>
  authStore.isAdmin || (authStore.user?.role !== 'viewer' && ['owner', 'member'].includes(myProjectRole.value)))
function isEditable(e: any): boolean {
  return e.status === 'draft' || e.status === 'rejected'
}

async function downloadAttachment(e: any) {
  try {
    const { blob, filename } = await entriesService.downloadAttachment(id, e.id, e.attachment_name ?? 'lampiran')
    saveFile(blob, filename)
  } catch (err: any) {
    ui.showError(getErrorMessage(err, 'Gagal mengunduh lampiran.'))
  }
}

const importDialog = ref(false)
const historyDialog = ref(false)
const historyEntryId = ref<number | null>(null)
function openHistory(entryId: number) {
  historyEntryId.value = entryId
  historyDialog.value = true
}

const rejectDialog = ref(false)
const rejectFormRef = ref()
const rejectReason = ref('')
const rejecting = ref(false)
let rejectEntryId: number | null = null

function openReject(e: any) {
  rejectEntryId = e.id
  rejectReason.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  const { valid } = await rejectFormRef.value.validate()
  if (!valid || rejectEntryId === null) return
  rejecting.value = true
  try {
    await entriesService.reject(id, rejectEntryId, rejectReason.value.trim())
    ui.showSnackbar('Entri ditolak dan dikembalikan ke pembuat.')
    rejectDialog.value = false
    await loadEntries()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menolak entri.'))
  } finally { rejecting.value = false }
}

function canApprove(e: any): boolean {
  return (authStore.isAdmin || myProjectRole.value === 'owner') && e.created_by?.id !== authStore.user?.id
}

function statusColor(s: string) { return PROJECT_STATUS_COLORS[s] ?? 'grey' }
function statusColor2(s: string) { return ENTRY_STATUS_COLORS[s] ?? 'grey' }
// Nilai aktual & persentase berasal dari endpoint /targets/progress (dipetakan per target_id).
function actual(t: any): number {
  return Number(targetProgress.value[t.id]?.actual_co2e_kg ?? 0)
}
function progress(t: any): number {
  const p = targetProgress.value[t.id]
  if (p?.percentage_used != null) return Number(p.percentage_used)
  return t.target_co2e_kg > 0 ? (actual(t) / t.target_co2e_kg) * 100 : 0
}
function isExceeded(t: any): boolean {
  return !!targetProgress.value[t.id]?.is_exceeded
}

const entryPage = usePageQuery()
const entriesMeta = ref<any>(null)

async function loadEntries() {
  const params: any = { page: entryPage.value }
  if (entryStatus.value) params.status = entryStatus.value
  const res = await entriesService.list(id, params)
  entries.value = res.data
  entriesMeta.value = res.meta
}

function onStatusFilter() {
  entryPage.value === 1 ? loadEntries() : (entryPage.value = 1)
}
watch(entryPage, loadEntries)

async function submitEntry(entryId: number) {
  try {
    await entriesService.submit(id, entryId)
    ui.showSnackbar('Entry berhasil di-submit.')
    await loadEntries()
  } catch (e: any) { ui.showError(getErrorMessage(e, 'Gagal submit entry.')) }
}

async function approveEntry(entryId: number) {
  try {
    await entriesService.approve(id, entryId)
    ui.showSnackbar('Entry berhasil di-approve.')
    await loadEntries()
  } catch (e: any) { ui.showError(getErrorMessage(e, 'Gagal approve entry.')) }
}

onMounted(async () => {
  try {
    const [proj, sum, mem, tgt, prog] = await Promise.all([
      projectsService.get(id),
      projectsService.getSummary(id),
      projectsService.getMembers(id),
      targetsService.list(id),
      targetsService.getProgress(id),
    ])
    project.value = proj
    summary.value = sum
    members.value = mem
    targets.value = tgt
    targetProgress.value = Object.fromEntries((prog ?? []).map((p: any) => [p.target_id, p]))
    await loadEntries()
  } finally {
    loading.value = false
  }
})
</script>
