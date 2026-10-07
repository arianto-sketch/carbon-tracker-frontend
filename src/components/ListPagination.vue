<template>
  <div v-if="meta && meta.last_page > 1" class="d-flex align-center justify-space-between flex-wrap ga-2 mt-4">
    <span class="text-caption text-medium-emphasis">
      Halaman {{ meta.current_page }} dari {{ meta.last_page }} · total {{ meta.total }}
    </span>
    <v-pagination :model-value="modelValue" :length="meta.last_page" density="compact" :total-visible="5"
      @update:model-value="emit('update:modelValue', $event)" />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  modelValue: number
  meta: { current_page: number; last_page: number; total: number } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [page: number] }>()

// Halaman di luar jangkauan (mis. ?page=999, atau item terakhir di halaman terakhir dihapus):
// pindah ke halaman terakhir yang ada, bukan menampilkan list kosong tanpa navigasi.
watch(() => props.meta, (meta) => {
  if (meta && meta.current_page > meta.last_page) emit('update:modelValue', meta.last_page)
})
</script>
