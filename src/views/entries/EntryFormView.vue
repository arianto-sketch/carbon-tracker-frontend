<template>
  <v-container class="pa-6" style="max-width: 680px">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="`/projects/${projectId}`" class="mb-4">Kembali</v-btn>
    <h1 class="text-h6 font-weight-bold mb-4">{{ isEdit ? 'Edit Entri Emisi' : 'Tambah Entri Emisi' }}</h1>

    <v-card rounded="lg" elevation="1">
      <v-card-text class="pa-5">
        <v-form ref="formRef" @submit.prevent="save">
          <v-select
            v-model="form.category_id"
            :items="categories"
            item-title="name"
            item-value="id"
            label="Kategori"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Wajib dipilih']"
            class="mb-3"
            @update:model-value="loadFactors"
          />
          <v-select
            v-model="form.emission_factor_id"
            :items="factors"
            item-title="name"
            item-value="id"
            label="Faktor Emisi"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Wajib dipilih']"
            :disabled="!form.category_id"
            class="mb-3"
            @update:model-value="updateUnit"
          />

          <v-row dense>
            <v-col cols="8">
              <v-text-field
                v-model.number="form.quantity"
                label="Jumlah"
                type="number"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Wajib diisi', v => v > 0 || 'Harus lebih dari 0']"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field :model-value="selectedUnit" label="Satuan" variant="outlined" density="comfortable" readonly />
            </v-col>
          </v-row>

          <v-text-field
            v-model="form.entry_date"
            label="Tanggal Aktivitas"
            type="date"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Wajib diisi']"
            class="mb-3"
          />
          <v-text-field
            v-if="selectedCategory?.slug === 'vendor'"
            v-model="form.vendor_name"
            label="Nama Vendor / Supplier"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-text-field
            v-if="selectedCategory?.slug === 'activity'"
            v-model="form.activity_type"
            label="Tipe Aktivitas"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-textarea
            v-model="form.description"
            label="Keterangan (opsional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            class="mb-3"
          />

          <v-alert v-if="estimatedCo2 > 0" type="success" variant="tonal" density="compact">
            Estimasi emisi: <strong>{{ formatCo2(estimatedCo2) }}</strong>
          </v-alert>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoriesService } from '@/services/categories.service'
import { entriesService } from '@/services/entries.service'
import { useUiStore } from '@/stores/ui.store'
import { formatCo2 } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const projectId = Number(route.params.id)
const entryId = route.params.entryId ? Number(route.params.entryId) : null
const isEdit = !!entryId
const formRef = ref()
const saving = ref(false)
const categories = ref<any[]>([])
const factors = ref<any[]>([])
const form = ref({ category_id: null as number | null, emission_factor_id: null as number | null,
  quantity: null as number | null, entry_date: '', description: '', vendor_name: '', activity_type: '' })

const selectedCategory = computed(() => categories.value.find(c => c.id === form.value.category_id))
const selectedFactor = computed(() => factors.value.find(f => f.id === form.value.emission_factor_id))
const selectedUnit = computed(() => selectedFactor.value?.source_unit ?? '-')
const estimatedCo2 = computed(() =>
  form.value.quantity && selectedFactor.value ? form.value.quantity * selectedFactor.value.factor_value : 0
)

async function loadFactors() {
  form.value.emission_factor_id = null
  if (!form.value.category_id) return
  const res = await categoriesService.listFactors({ category_id: form.value.category_id })
  factors.value = res.data
}

function updateUnit() {}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (isEdit) {
      await entriesService.update(projectId, entryId!, form.value)
      ui.showSnackbar('Entri berhasil diperbarui.')
    } else {
      await entriesService.create(projectId, form.value)
      ui.showSnackbar('Entri berhasil ditambahkan.')
    }
    router.push(`/projects/${projectId}`)
  } catch (e: any) {
    ui.showError(e.response?.data?.message ?? 'Gagal menyimpan entri.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  categories.value = await categoriesService.listCategories()
  if (isEdit) {
    const entry = await entriesService.get(projectId, entryId!)
    form.value = {
      category_id: entry.category?.id,
      emission_factor_id: entry.emission_factor?.id,
      quantity: entry.quantity,
      entry_date: entry.entry_date,
      description: entry.description ?? '',
      vendor_name: entry.vendor_name ?? '',
      activity_type: entry.activity_type ?? '',
    }
    await loadFactors()
  }
})
</script>
