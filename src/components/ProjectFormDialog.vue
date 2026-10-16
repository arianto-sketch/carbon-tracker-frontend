<template>
  <v-dialog :model-value="modelValue" max-width="560" aria-labelledby="project-form-title"
    @update:model-value="(open: boolean) => emit('update:modelValue', open)">
    <v-card rounded="lg">
      <v-card-title id="project-form-title" class="pa-5 pb-2">{{ project ? 'Ubah Project' : 'Project Baru' }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="save">
          <v-row dense>
            <v-col cols="8">
              <v-text-field v-model="form.name" label="Nama Project" variant="outlined" density="comfortable"
                :rules="[(v: string) => !!v || 'Wajib diisi']" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="form.code" label="Kode" variant="outlined" density="comfortable"
                :rules="[(v: string) => !!v || 'Wajib diisi']" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.client_name" label="Nama Client" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="form.description" label="Deskripsi" variant="outlined" density="comfortable" rows="2" auto-grow />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.start_date" label="Tanggal Mulai" type="date" variant="outlined" density="comfortable"
                :rules="[(v: string) => !!v || 'Wajib diisi']" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.end_date" label="Tanggal Selesai" type="date" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.team_size" label="Jumlah anggota tim" type="number" min="1" variant="outlined"
                density="comfortable" hint="Untuk intensitas emisi per orang (opsional)" persistent-hint
                :rules="[teamSizeRule]" />
            </v-col>
            <v-col v-if="project" cols="6">
              <v-select v-model="form.status" :items="statusOptions" label="Status" variant="outlined" density="comfortable" />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Batal</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getErrorMessage } from '@/services/api'
import { projectsService } from '@/services/projects.service'
import { useUiStore } from '@/stores/ui.store'
import { PROJECT_STATUS_LABELS } from '@/utils/constants'

// Tanpa `project`: membuat project baru; dengan `project`: mengubahnya (owner/admin)
const props = defineProps<{ modelValue: boolean; project?: any }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; saved: [project: any] }>()
const ui = useUiStore()

const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, title]) => ({ title, value }))

const formRef = ref()
const saving = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return { name: '', code: '', client_name: '', description: '', start_date: '', end_date: '', team_size: '' as string | number, status: 'active' }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  const p = props.project
  form.value = p
    ? {
        name: p.name, code: p.code, client_name: p.client_name ?? '', description: p.description ?? '',
        start_date: p.start_date, end_date: p.end_date ?? '', team_size: p.team_size ?? '', status: p.status,
      }
    : emptyForm()
})

function teamSizeRule(v: string | number): true | string {
  if (v === '' || v === null) return true
  const n = Number(v)
  return (Number.isInteger(n) && n >= 1 && n <= 100000) || 'Bilangan bulat 1–100.000'
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const f = form.value
  // PUT mengganti seluruh field, jadi deskripsi dan jumlah anggota tim selalu dikirim (kosong = null)
  const payload = {
    name: f.name,
    code: f.code,
    client_name: f.client_name || null,
    description: f.description || null,
    start_date: f.start_date,
    end_date: f.end_date || null,
    team_size: f.team_size === '' || f.team_size === null ? null : Number(f.team_size),
    ...(props.project ? { status: f.status } : {}),
  }
  saving.value = true
  try {
    const saved = props.project
      ? await projectsService.update(props.project.id, payload)
      : await projectsService.create(payload)
    ui.showSnackbar(props.project ? 'Project berhasil diperbarui.' : 'Project berhasil dibuat.')
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (e: any) {
    ui.showError(getErrorMessage(e, props.project ? 'Gagal memperbarui project.' : 'Gagal membuat project.'))
  } finally {
    saving.value = false
  }
}
</script>
