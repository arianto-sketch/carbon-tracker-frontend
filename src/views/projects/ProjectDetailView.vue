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
          <div class="d-flex align-center ga-1">
            <h1 class="text-h5 font-weight-bold">{{ project.name }}</h1>
            <v-btn v-if="canManage" icon="mdi-pencil" size="small" variant="text" aria-label="Ubah project" @click="editDialog = true" />
          </div>
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
        <v-tab value="initiatives">Rencana Aksi</v-tab>
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
          <!-- Review massal: hanya entri submitted yang boleh di-review user ini (owner/admin, bukan buatan sendiri) -->
          <div v-if="selected.length" class="d-flex flex-wrap align-center ga-2 mb-2">
            <span class="text-body-2 font-weight-medium" role="status">{{ selected.length }} entri dipilih</span>
            <v-btn size="small" color="green" variant="tonal" prepend-icon="mdi-check-all" :loading="bulkBusy"
              @click="bulkReview('approve')">Setujui terpilih</v-btn>
            <v-btn size="small" color="error" variant="tonal" prepend-icon="mdi-close-box-multiple" :disabled="bulkBusy"
              @click="openBulkReject">Tolak terpilih</v-btn>
            <v-btn size="small" variant="text" @click="selected = []">Kosongkan pilihan</v-btn>
          </div>
          <v-alert v-if="skippedReport.length" type="warning" variant="tonal" density="compact" closable class="mb-2"
            @click:close="skippedReport = []">
            <div class="font-weight-medium">{{ skippedReport.length }} entri dilewati:</div>
            <div v-for="s in skippedReport" :key="s.id" class="text-body-2">{{ s.label }}: {{ s.reason }}</div>
          </v-alert>
          <v-table density="compact">
            <thead><tr>
              <th v-if="canReviewAny" style="width: 40px">
                <v-checkbox-btn v-model="allSelected" :indeterminate="someSelected" density="compact"
                  aria-label="Pilih semua entri yang bisa di-review" />
              </th>
              <th>Tanggal</th><th>Kategori</th><th>Faktor Emisi</th>
              <th>Jumlah</th><th>Emisi</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              <tr v-if="!entries.length">
                <td :colspan="canReviewAny ? 8 : 7">
                  <EmptyState compact icon="mdi-clipboard-text-outline" title="Belum ada entri"
                    :text="canWrite ? 'Tambahkan entri atau import dari Excel/CSV.' : undefined" />
                </td>
              </tr>
              <tr v-for="e in entries" :key="e.id">
                <td v-if="canReviewAny">
                  <v-checkbox-btn v-if="isReviewable(e)" v-model="selected" :value="e.id" density="compact"
                    :aria-label="`Pilih entri ${formatDate(e.entry_date)} ${e.quantity} ${e.source_unit}`" />
                </td>
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
                  <v-btn v-if="canWrite" icon="mdi-content-copy" size="x-small" variant="text" aria-label="Salin entri"
                    :to="`/projects/${id}/entries/new?copyFrom=${e.id}`" />
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
            <v-col v-if="!targets.length" cols="12">
              <EmptyState compact icon="mdi-target" title="Belum ada target"
                text="Tetapkan target emisi untuk memantau pemakaian terhadap batas yang direncanakan." />
            </v-col>
            <v-col v-for="t in targets" :key="t.id" cols="12" md="6">
              <v-card rounded="lg" elevation="1">
                <v-card-text>
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="font-weight-bold">{{ t.category?.name ?? 'Semua Kategori' }}</span>
                    <div class="d-flex align-center">
                      <span class="text-caption">{{ PERIOD_LABELS[t.period_type] ?? t.period_type }}{{ t.period_value ? ` ${t.period_value}` : '' }} {{ t.period_year }}</span>
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

        <!-- RENCANA AKSI TAB (dimuat saat tab pertama kali dibuka) -->
        <v-window-item value="initiatives">
          <ReductionInitiativesPanel :project-id="id" :members="members" :can-write="canWrite" :can-delete="canManage" />
        </v-window-item>

        <!-- MEMBERS TAB -->
        <v-window-item value="members">
          <ProjectMembersPanel :project-id="id" :members="members" :can-manage="canManage" :reload="reloadMembers" />
        </v-window-item>

        <!-- SUMMARY TAB -->
        <v-window-item value="summary">
          <v-row>
            <v-col cols="12" md="4">
              <v-card rounded="lg" elevation="1" role="region" aria-labelledby="intensity-title">
                <v-card-text>
                  <div id="intensity-title" class="text-body-2 text-medium-emphasis mb-1">Intensitas emisi</div>
                  <div class="text-h6 font-weight-bold text-primary">{{ formatIntensity(summary?.intensity_kg_per_person) }}</div>
                  <div class="text-caption text-medium-emphasis">
                    <template v-if="summary?.team_size">Total disetujui ÷ {{ summary.team_size }} anggota tim</template>
                    <template v-else-if="canManage">Isi jumlah anggota tim lewat tombol ubah project untuk menghitung intensitas.</template>
                    <template v-else>Jumlah anggota tim belum diisi owner project.</template>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
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

    <ProjectFormDialog v-model="editDialog" :project="project" @saved="onProjectSaved" />
    <EntryHistoryDialog v-model="historyDialog" :project-id="id" :entry-id="historyEntryId" />
    <ImportEntriesDialog v-model="importDialog" :project-id="id" @imported="loadEntries" />

    <v-dialog v-model="rejectDialog" max-width="480" aria-labelledby="reject-title">
      <v-card rounded="lg">
        <v-card-title id="reject-title" class="pa-5 pb-2">{{ rejectIds.length ? `Tolak ${rejectIds.length} entri` : 'Tolak Entri' }}</v-card-title>
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
import EmptyState from '@/components/EmptyState.vue'
import { useAccessErrorRedirect } from '@/composables/useAccessErrorRedirect'
import { projectsService } from '@/services/projects.service'
import { entriesService } from '@/services/entries.service'
import { targetsService } from '@/services/targets.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2, formatDate } from '@/utils/formatters'
import { getErrorMessage } from '@/services/api'
import EntryHistoryDialog from '@/components/EntryHistoryDialog.vue'
import ImportEntriesDialog from '@/components/ImportEntriesDialog.vue'
import ProjectFormDialog from '@/components/ProjectFormDialog.vue'
import ProjectMembersPanel from '@/components/ProjectMembersPanel.vue'
import ReductionInitiativesPanel from '@/components/ReductionInitiativesPanel.vue'
import { formatIntensity } from '@/utils/initiatives'
import ListPagination from '@/components/ListPagination.vue'
import { usePageQuery } from '@/composables/usePageQuery'
import { saveFile } from '@/services/download'
import { ENTRY_STATUS_COLORS, ENTRY_STATUS_LABELS, PERIOD_LABELS, PROJECT_STATUS_COLORS } from '@/utils/constants'

const route = useRoute()
const handleAccessError = useAccessErrorRedirect()
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
// current_user_role dari backend sudah memperhitungkan role global Viewer
const canManage = computed(() => authStore.isAdmin || myProjectRole.value === 'owner')

// Setelah anggota berubah: role user sendiri bisa ikut berubah (mis. owner menurunkan dirinya)
async function reloadMembers() {
  try {
    const [proj, mem] = await Promise.all([projectsService.get(id), projectsService.getMembers(id)])
    project.value = proj
    members.value = mem
  } catch (e: any) {
    if (!handleAccessError(e)) ui.showError(getErrorMessage(e, 'Gagal memuat anggota.'))
  }
}
const editDialog = ref(false)
// Intensitas di ringkasan bergantung pada jumlah anggota tim, jadi ringkasan ikut dimuat ulang
async function onProjectSaved(saved: any) {
  project.value = saved
  try {
    summary.value = await projectsService.getSummary(id)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal memuat ringkasan project.'))
  }
}

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
  rejectIds.value = []
  rejectEntryId = e.id
  rejectReason.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  const { valid } = await rejectFormRef.value.validate()
  if (!valid) return
  if (rejectIds.value.length) {
    rejecting.value = true
    try {
      // Dialog (dan alasan yang sudah diketik) tetap terbuka bila gagal
      if (await bulkReview('reject', rejectReason.value.trim(), rejectIds.value)) {
        rejectDialog.value = false
        rejectIds.value = []
      }
    } finally {
      rejecting.value = false
    }
    return
  }
  if (rejectEntryId === null) return
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

// --- Review massal ---
const selected = ref<number[]>([])
const rejectIds = ref<number[]>([])
const bulkBusy = ref(false)
const skippedReport = ref<{ id: number; label: string; reason: string }[]>([])
function isReviewable(e: any): boolean {
  return e.status === 'submitted' && canApprove(e)
}
const reviewableIds = computed(() => entries.value.filter(isReviewable).map(e => e.id))
const canReviewAny = computed(() => reviewableIds.value.length > 0)
const allSelected = computed({
  get: () => canReviewAny.value && reviewableIds.value.every(eid => selected.value.includes(eid)),
  set: (all: boolean) => { selected.value = all ? [...reviewableIds.value] : [] },
})
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value)
// Halaman/filter berganti atau entri sudah di-review: pilihan yang tidak lagi tampil dibuang.
// (Daftar di dialog tolak massal yang sedang terbuka tidak ikut dipangkas; backend melewatinya.)
watch(reviewableIds, (ids) => { selected.value = selected.value.filter(eid => ids.includes(eid)) })

function openBulkReject() {
  rejectIds.value = [...selected.value]
  rejectEntryId = null
  rejectReason.value = ''
  rejectDialog.value = true
}

/** @returns true bila permintaan diproses (sebagian entri boleh dilewati) */
async function bulkReview(action: 'approve' | 'reject', reason?: string, ids: number[] = selected.value): Promise<boolean> {
  if (bulkBusy.value) return false
  // Label disimpan sebelum daftar dimuat ulang, untuk menjelaskan entri yang dilewati
  const labels = new Map(entries.value.map(e => [e.id, `${formatDate(e.entry_date)} · ${e.emission_factor?.name ?? '-'} · ${e.quantity} ${e.source_unit}`]))
  bulkBusy.value = true
  try {
    const res = await entriesService.bulkReview(id, { action, entry_ids: [...ids], ...(reason ? { reason } : {}) })
    ui.showSnackbar(res.message)
    skippedReport.value = res.skipped.map(s => ({ id: s.id, label: labels.get(s.id) ?? `Entri #${s.id}`, reason: s.reason }))
    selected.value = []
    await loadEntries()
    return true
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal memproses entri terpilih.'))
    return false
  } finally {
    bulkBusy.value = false
  }
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
  if (entryPage.value === 1) loadEntries()
  else entryPage.value = 1
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
  } catch (e: any) {
    // Bukan anggota -> /403; project tidak ada -> 404 dengan URL tetap
    if (!handleAccessError(e)) ui.showError(getErrorMessage(e, 'Gagal memuat project.'))
  } finally {
    loading.value = false
  }
})
</script>
