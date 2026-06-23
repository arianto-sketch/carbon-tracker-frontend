<template>
  <v-container class="pa-6" style="max-width: 560px">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="`/projects/${projectId}`" class="mb-4">Kembali</v-btn>
    <h1 class="text-h6 font-weight-bold mb-4">{{ isEdit ? 'Edit Target Emisi' : 'Tambah Target Emisi' }}</h1>

    <v-card rounded="lg" elevation="1">
      <v-card-text class="pa-5">
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
            <v-col cols="6">
              <v-text-field v-if="form.period_type !== 'yearly'" v-model.number="form.period_value"
                :label="form.period_type === 'monthly' ? 'Bulan (1-12)' : 'Kuartal (1-4)'"
                type="number" variant="outlined" density="comfortable" />
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
        <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoriesService } from '@/services/categories.service'
import { targetsService } from '@/services/targets.service'
import { useUiStore } from '@/stores/ui.store'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const projectId = Number(route.params.id)
const targetId = route.params.targetId ? Number(route.params.targetId) : null
const isEdit = !!targetId
const formRef = ref()
const saving = ref(false)
const categories = ref<any[]>([])
const periodTypes = ['monthly', 'quarterly', 'yearly']
const form = ref({ category_id: null, period_type: 'monthly', period_year: new Date().getFullYear(),
  period_value: null, target_co2e_kg: null, baseline_co2e_kg: null, notes: '' })

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (isEdit) {
      await targetsService.update(projectId, targetId!, form.value)
      ui.showSnackbar('Target berhasil diperbarui.')
    } else {
      await targetsService.create(projectId, form.value)
      ui.showSnackbar('Target berhasil dibuat.')
    }
    router.push(`/projects/${projectId}`)
  } catch (e: any) {
    ui.showError(e.response?.data?.message ?? 'Gagal menyimpan target.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  categories.value = await categoriesService.listCategories()
})
</script>
