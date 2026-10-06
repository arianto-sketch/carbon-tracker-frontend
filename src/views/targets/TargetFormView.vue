<template>
  <v-container class="pa-6" style="max-width: 560px">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="`/projects/${projectId}`" class="mb-4">Kembali</v-btn>
    <h1 class="text-h6 font-weight-bold mb-4">{{ isEdit ? 'Edit Target Emisi' : 'Tambah Target Emisi' }}</h1>

    <v-card rounded="lg" elevation="1">
      <div v-if="loadingTarget" class="text-center pa-8"><v-progress-circular indeterminate color="primary" /></div>
      <v-card-text v-else class="pa-5">
        <v-form ref="formRef" @submit.prevent="save">
          <v-select v-model="form.category_id" :items="categories" item-title="name" item-value="id"
            label="Kategori (kosongkan = semua)" variant="outlined" density="comfortable" clearable class="mb-3" />
          <v-select v-model="form.period_type" :items="periodTypes" label="Tipe Periode" variant="outlined"
            density="comfortable" :rules="[v => !!v || 'Wajib dipilih']" class="mb-3" />
          <v-row dense>
            <v-col cols="6">
              <v-text-field v-model.number="form.period_year" label="Tahun" type="number" variant="outlined"
                density="comfortable" :rules="[v => !!v || 'Wajib diisi']" />
            </v-col>
            <v-col v-if="form.period_type !== 'yearly'" cols="6">
              <v-text-field v-model.number="form.period_value"
                :label="form.period_type === 'monthly' ? 'Bulan (1-12)' : 'Kuartal (1-4)'"
                type="number" variant="outlined" density="comfortable" :rules="periodValueRules" />
            </v-col>
          </v-row>
          <v-text-field v-model.number="form.target_co2e_kg" label="Target Emisi (kg CO₂e)" type="number"
            variant="outlined" density="comfortable" :rules="[v => !!v || 'Wajib diisi', v => v > 0 || 'Harus > 0']" class="mb-3" />
          <v-text-field v-model.number="form.baseline_co2e_kg" label="Baseline Emisi (opsional, kg CO₂e)"
            type="number" variant="outlined" density="comfortable" class="mb-3" />
          <v-textarea v-model="form.notes" label="Catatan" variant="outlined" density="comfortable" rows="2" />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" :to="`/projects/${projectId}`">Batal</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loadingTarget" @click="save">Simpan</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoriesService } from '@/services/categories.service'
import { targetsService } from '@/services/targets.service'
import { getErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/ui.store'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const projectId = Number(route.params.id)
const targetId = route.params.targetId ? Number(route.params.targetId) : null
const isEdit = !!targetId
const formRef = ref()
const saving = ref(false)
const loadingTarget = ref(isEdit)
const categories = ref<any[]>([])
const periodTypes = [
  { title: 'Bulanan', value: 'monthly' },
  { title: 'Kuartalan', value: 'quarterly' },
  { title: 'Tahunan', value: 'yearly' },
]
const form = ref({
  category_id: null as number | null,
  period_type: 'monthly',
  period_year: new Date().getFullYear() as number | null,
  period_value: null as number | null,
  target_co2e_kg: null as number | null,
  baseline_co2e_kg: null as number | null,
  notes: '' as string | null,
})

const periodValueRules = computed(() => {
  const max = form.value.period_type === 'monthly' ? 12 : 4
  return [
    (v: any) => (v !== null && v !== undefined && v !== '') || 'Wajib diisi',
    (v: any) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= max) || `Harus antara 1 - ${max}`,
  ]
})

// Periode tahunan tidak memakai period_value.
watch(() => form.value.period_type, (type) => {
  if (type === 'yearly') form.value.period_value = null
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  const payload = {
    ...form.value,
    period_value: form.value.period_type === 'yearly' ? null : form.value.period_value,
  }
  try {
    if (isEdit) {
      await targetsService.update(projectId, targetId!, payload)
      ui.showSnackbar('Target berhasil diperbarui.')
    } else {
      await targetsService.create(projectId, payload)
      ui.showSnackbar('Target berhasil dibuat.')
    }
    router.push(`/projects/${projectId}`)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menyimpan target.'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [cats, target] = await Promise.all([
      categoriesService.listCategories(),
      isEdit ? targetsService.get(projectId, targetId!) : Promise.resolve(null),
    ])
    categories.value = cats
    if (target) {
      form.value = {
        category_id: target.category?.id ?? null,
        period_type: target.period_type,
        period_year: target.period_year,
        period_value: target.period_type === 'yearly' ? null : target.period_value,
        target_co2e_kg: target.target_co2e_kg,
        baseline_co2e_kg: target.baseline_co2e_kg,
        notes: target.notes ?? '',
      }
    }
  } catch (e: any) {
    ui.showError(getErrorMessage(e, isEdit ? 'Gagal memuat data target.' : 'Gagal memuat kategori.'))
    if (isEdit) router.push(`/projects/${projectId}`)
  } finally {
    loadingTarget.value = false
  }
})
</script>
