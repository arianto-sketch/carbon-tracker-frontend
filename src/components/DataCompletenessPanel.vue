<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Faktor rutin (tercatat di minimal 2 dari 3 bulan sebelumnya) yang belum dicatat ditandai
      <strong>Belum diisi</strong>. Pengingat dikirim tanggal 5 dan 10. Bila bulan itu memang tidak ada datanya,
      tandai <strong>Tidak ada data</strong> agar tidak diingatkan lagi.
    </p>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">
      Gagal memuat kelengkapan data.
      <template #append><v-btn variant="text" size="small" @click="refresh">Coba lagi</v-btn></template>
    </v-alert>
    <div v-else-if="!grid" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>

    <v-table v-else density="compact">
      <caption class="d-sr-only">Kelengkapan data {{ grid.months.length }} bulan terakhir</caption>
      <thead><tr>
        <th>Faktor emisi</th>
        <th v-for="m in grid.months" :key="`${m.year}-${m.month}`" class="text-center">{{ m.label }}</th>
      </tr></thead>
      <tbody>
        <tr v-if="showProjectRow">
          <td class="font-weight-medium">Seluruh project</td>
          <td v-for="m in grid.months" :key="`project-${m.year}-${m.month}`" class="text-center">
            <template v-if="m.empty">
              <v-chip color="error" size="small" variant="tonal" prepend-icon="mdi-alert-circle">Belum ada entri</v-chip>
              <v-btn v-if="canWrite" size="x-small" variant="text" :loading="busy === key(m)"
                :aria-label="`Tandai seluruh project ${m.label} tidak ada data`" @click="mark(m)">Tidak ada data</v-btn>
            </template>
            <template v-else-if="m.dismissed">
              <v-chip :color="STATUS.dismissed.color" size="small" variant="tonal" :prepend-icon="STATUS.dismissed.icon">{{ STATUS.dismissed.label }}</v-chip>
              <v-btn v-if="canWrite" size="x-small" variant="text" :loading="busy === key(m)"
                :aria-label="`Batalkan tanda seluruh project ${m.label}`" @click="unmark(m)">Batalkan</v-btn>
            </template>
            <span v-else class="text-medium-emphasis">—</span>
          </td>
        </tr>
        <tr v-if="!grid.factors.length && !showProjectRow">
          <td :colspan="grid.months.length + 1">
            <EmptyState compact icon="mdi-calendar-check" title="Belum ada faktor rutin"
              text="Faktor akan muncul di sini setelah dicatat beberapa bulan." />
          </td>
        </tr>
        <tr v-for="f in grid.factors" :key="f.id">
          <td>{{ f.name }}</td>
          <td v-for="(s, i) in f.statuses" :key="i" class="text-center">
            <span v-if="s === 'none'" class="text-medium-emphasis">—</span>
            <v-chip v-else :color="STATUS[s].color" size="small" variant="tonal" :prepend-icon="STATUS[s].icon">{{ STATUS[s].label }}</v-chip>
            <template v-if="canWrite">
              <v-btn v-if="s === 'missing'" size="x-small" variant="text" :loading="busy === key(grid.months[i]!, f.id)"
                :aria-label="`Tandai ${f.name} ${grid.months[i]!.label} tidak ada data`" @click="mark(grid.months[i]!, f.id)">Tidak ada data</v-btn>
              <!-- Tanda untuk seluruh project dibatalkan dari baris "Seluruh project" -->
              <v-btn v-else-if="s === 'dismissed' && !grid.months[i]!.dismissed" size="x-small" variant="text"
                :loading="busy === key(grid.months[i]!, f.id)" :aria-label="`Batalkan tanda ${f.name} ${grid.months[i]!.label}`"
                @click="unmark(grid.months[i]!, f.id)">Batalkan</v-btn>
            </template>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { getErrorMessage } from '@/services/api'
import { completenessService, type CompletenessGrid, type CompletenessMonth } from '@/services/completeness.service'
import { useUiStore } from '@/stores/ui.store'
import { COMPLETENESS_STATUS as STATUS } from '@/utils/completeness'

// Data dimuat parent (peringatan di tab Entri memakai data yang sama); reload dipanggil setelah menandai
const props = defineProps<{
  projectId: number
  grid: CompletenessGrid | null
  error: boolean
  canWrite: boolean
  reload: () => Promise<void>
}>()
const ui = useUiStore()

const busy = ref<string | null>(null)
const showProjectRow = computed(() => !!props.grid?.months.some(m => m.empty || m.dismissed))

function key(m: CompletenessMonth, factorId: number | null = null): string {
  return `${m.year}-${m.month}-${factorId ?? 'project'}`
}

function refresh() {
  return props.reload().catch(() => undefined)
}

async function run(m: CompletenessMonth, factorId: number | null, action: 'dismiss' | 'undismiss') {
  if (busy.value) return
  busy.value = key(m, factorId)
  try {
    const target = { period_year: m.year, period_month: m.month, emission_factor_id: factorId }
    if (action === 'dismiss') await completenessService.dismiss(props.projectId, target)
    else await completenessService.undismiss(props.projectId, target)
    ui.showSnackbar(action === 'dismiss' ? `Ditandai tidak ada data ${m.label}.` : 'Tanda tidak ada data dibatalkan.')
    await refresh()
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menyimpan tanda tidak ada data.'))
  } finally {
    busy.value = null
  }
}

const mark = (m: CompletenessMonth, factorId: number | null = null) => run(m, factorId, 'dismiss')
const unmark = (m: CompletenessMonth, factorId: number | null = null) => run(m, factorId, 'undismiss')
</script>
