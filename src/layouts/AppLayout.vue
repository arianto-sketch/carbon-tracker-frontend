<template>
  <v-app>
    <!-- Sidebar -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent color="white">
      <v-list-item
        prepend-icon="mdi-leaf-circle"
        title="Carbon Tracker"
        nav
        class="py-4"
      >
        <template #append>
          <v-btn :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'" variant="text" @click="rail = !rail" />
        </template>
      </v-list-item>

      <v-divider />

      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" to="/" exact />
        <v-list-item prepend-icon="mdi-folder-multiple" title="Projects" to="/projects" />
        <v-list-item prepend-icon="mdi-file-chart" title="Laporan" to="/reports" />
        <template v-if="authStore.isAdmin">
          <v-divider class="my-2" />
          <v-list-item prepend-icon="mdi-cog" title="Emission Factors" to="/admin/emission-factors" />
        </template>
      </v-list>

      <template #append>
        <v-divider />
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-account" :title="authStore.user?.name ?? ''" to="/profile" />
          <v-list-item prepend-icon="mdi-logout" title="Logout" @click="handleLogout" />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main -->
    <v-main class="bg-background">
      <router-view />
    </v-main>

    <!-- Global Snackbar -->
    <v-snackbar v-model="uiStore.snackbar.show" :color="uiStore.snackbar.color" timeout="3000" location="bottom right">
      {{ uiStore.snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="uiStore.snackbar.show = false">Tutup</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()
const drawer = ref(true)
const rail = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
