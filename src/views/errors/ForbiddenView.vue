<template>
  <v-container class="pa-6 d-flex align-center justify-center" style="min-height: 70vh">
    <EmptyState icon="mdi-lock-outline" title="Akses ditolak"
      text="Anda tidak punya izin untuk membuka halaman ini. Hubungi admin atau owner project bila memerlukan akses.">
      <v-btn color="primary" to="/" prepend-icon="mdi-view-dashboard">Kembali ke Dashboard</v-btn>
    </EmptyState>
  </v-container>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>
