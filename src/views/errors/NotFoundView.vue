<template>
  <v-container class="pa-6 d-flex align-center justify-center" style="min-height: 70vh">
    <EmptyState icon="mdi-map-marker-question-outline" title="Halaman tidak ditemukan"
      text="Alamat yang Anda buka tidak ada atau datanya sudah dihapus.">
      <v-btn color="primary" to="/" prepend-icon="mdi-view-dashboard">Kembali ke Dashboard</v-btn>
    </EmptyState>
  </v-container>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>
