<template>
  <v-empty-state :icon="icon" :title="title" :text="text" :size="compact ? 48 : undefined" :class="{ 'py-4': compact }">
    <template v-if="$slots.default" #actions>
      <slot />
    </template>
  </v-empty-state>
</template>

<script setup lang="ts">
// Tampilan kosong/error yang konsisten; `compact` untuk dipakai di dalam tabel atau tab
defineProps<{ icon: string; title: string; text?: string; compact?: boolean }>()
</script>
