<template>
  <v-empty-state :icon="icon" :text="text" :size="compact ? 48 : undefined" :class="{ 'py-4': compact }">
    <template #title>
      <!-- `heading`: judul jadi heading sungguhan (mis. h1 di halaman error), bisa difokus untuk pembaca layar -->
      <component :is="heading ? `h${heading}` : 'div'" ref="titleRef" :tabindex="heading ? -1 : undefined"
        class="empty-state-title">{{ title }}</component>
    </template>
    <template v-if="$slots.default" #actions>
      <slot />
    </template>
  </v-empty-state>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Tampilan kosong/error yang konsisten; `compact` untuk dipakai di dalam tabel atau tab.
// `autofocus` memindahkan fokus ke judul saat tampil (halaman error setelah navigasi).
const props = defineProps<{ icon: string; title: string; text?: string; compact?: boolean; heading?: 1 | 2 | 3; autofocus?: boolean }>()

const titleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (props.autofocus) titleRef.value?.focus()
})
</script>

<style scoped>
/* Heading mengikuti gaya judul v-empty-state, bukan ukuran default h1/h2 */
.empty-state-title {
  font: inherit;
  margin: 0;
  outline: none;
}
</style>
