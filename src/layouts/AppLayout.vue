<template>
  <v-app>
    <!-- Sidebar -->
    <!-- Layar kecil: drawer menutupi konten (temporary) agar tidak mendorong konten keluar layar -->
    <v-navigation-drawer v-model="drawer" :rail="rail && !mobile" :permanent="!mobile" :temporary="mobile" color="white">
      <v-list-item
        prepend-icon="mdi-leaf-circle"
        title="Carbon Tracker"
        nav
        class="py-4"
      >
        <template v-if="!mobile" #append>
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
          <v-list-item prepend-icon="mdi-account-group" title="Users" to="/admin/users" />
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

    <!-- Top bar: notifikasi -->
    <v-app-bar flat density="compact" color="white" border="b">
      <v-app-bar-nav-icon v-if="mobile" aria-label="Buka menu" @click="drawer = !drawer" />
      <v-spacer />
      <NotificationBell class="mr-2" />
    </v-app-bar>

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
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import NotificationBell from '@/components/NotificationBell.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()
// Di bawah 960px (sm ke bawah) drawer jadi menu yang dibuka lewat tombol di app bar
const { smAndDown: mobile } = useDisplay()
const drawer = ref(!mobile.value)
const rail = ref(false)

watch(mobile, (isMobile) => { drawer.value = !isMobile })
// Di layar kecil, menu ditutup setelah memilih halaman
watch(() => route.path, () => { if (mobile.value) drawer.value = false })

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
