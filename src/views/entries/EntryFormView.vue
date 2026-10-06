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

    <v-card v-if="isEdit && entry" rounded="lg" elevation="1" class="mt-4">
      <v-card-title class="pa-5 pb-2 text-body-1 font-weight-bold">Lampiran Bukti</v-card-title>
      <v-card-text class="pa-5 pt-0">
        <div v-if="entry.has_attachment" class="d-flex align-center ga-2 mb-3">
          <v-icon size="small">mdi-paperclip</v-icon>
          <span class="text-body-2">{{ entry.attachment_name }}</span>
          <v-spacer />
          <v-btn size="small" variant="text" @click="downloadAttachment">Unduh</v-btn>
          <v-btn v-if="attachmentEditable" size="small" variant="text" color="error" :loading="removingAttachment"
            @click="removeAttachment">Hapus</v-btn>
        </div>
        <p v-else class="text-body-2 text-medium-emphasis mb-3">Belum ada lampiran.</p>
        <div v-if="attachmentEditable" class="d-flex ga-2 align-start">
          <v-file-input v-model="attachmentFile" label="Pilih file (PDF/JPG/PNG, maks 5 MB)" accept=".pdf,.jpg,.jpeg,.png"
            variant="outlined" density="comfortable" prepend-icon="" prepend-inner-icon="mdi-paperclip" show-size
            :rules="[fileSizeRule]" hide-details="auto" />
          <v-btn color="primary" variant="tonal" class="mt-1" :disabled="!selectedFile" :loading="uploadingAttachment"
            @click="uploadAttachment">{{ entry.has_attachment ? 'Ganti' : 'Unggah' }}</v-btn>
        </div>
      </v-card-text>
    </v-card>
    <p v-else-if="!isEdit" class="text-caption text-medium-emphasis mt-3">
      Lampiran bukti (struk/invoice) bisa ditambahkan setelah entri disimpan, lewat menu Edit.
    </p>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoriesService } from '@/services/categories.service'
import { entriesService } from '@/services/entries.service'
import { getErrorMessage } from '@/services/api'
import { saveFile } from '@/services/download'
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
const entry = ref<any>(null)
const attachmentFile = ref<File | File[] | null>(null)
const uploadingAttachment = ref(false)
const removingAttachment = ref(false)
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const selectedFile = computed<File | null>(() =>
  Array.isArray(attachmentFile.value) ? attachmentFile.value[0] ?? null : attachmentFile.value)
const attachmentEditable = computed(() => ['draft', 'rejected'].includes(entry.value?.status))
const fileSizeRule = (v: File | File[] | null) => {
  const f = Array.isArray(v) ? v[0] : v
  return !f || f.size <= MAX_ATTACHMENT_BYTES || 'Ukuran file maksimal 5 MB'
}

async function uploadAttachment() {
  const file = selectedFile.value
  if (!file || file.size > MAX_ATTACHMENT_BYTES) return
  uploadingAttachment.value = true
  try {
    entry.value = await entriesService.uploadAttachment(projectId, entryId!, file)
    attachmentFile.value = null
    ui.showSnackbar('Lampiran berhasil diunggah.')
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengunggah lampiran.'))
  } finally { uploadingAttachment.value = false }
}

async function removeAttachment() {
  removingAttachment.value = true
  try {
    entry.value = await entriesService.removeAttachment(projectId, entryId!)
    ui.showSnackbar('Lampiran dihapus.')
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal menghapus lampiran.'))
  } finally { removingAttachment.value = false }
}

async function downloadAttachment() {
  try {
    const { blob, filename } = await entriesService.downloadAttachment(projectId, entryId!, entry.value?.attachment_name ?? 'lampiran')
    saveFile(blob, filename)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengunduh lampiran.'))
  }
}
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
    ui.showError(getErrorMessage(e, 'Gagal menyimpan entri.'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  categories.value = await categoriesService.listCategories()
  if (isEdit) {
    const loaded = await entriesService.get(projectId, entryId!)
    entry.value = loaded
    form.value = {
      category_id: loaded.category?.id,
      emission_factor_id: loaded.emission_factor?.id,
      quantity: loaded.quantity,
      entry_date: loaded.entry_date,
      description: loaded.description ?? '',
      vendor_name: loaded.vendor_name ?? '',
      activity_type: loaded.activity_type ?? '',
    }
    await loadFactors()
  }
})
</script>
