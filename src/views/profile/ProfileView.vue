<template>
  <v-container class="pa-6" style="max-width: 560px">
    <h1 class="text-h5 font-weight-bold mb-6">Profil</h1>
    <v-card rounded="lg" elevation="1" class="mb-4">
      <v-card-text class="pa-5">
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary" size="56" class="mr-3">
            <span class="text-white text-h6">{{ authStore.user?.name?.[0] }}</span>
          </v-avatar>
          <div>
            <div class="font-weight-bold">{{ authStore.user?.name }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ authStore.user?.email }}</div>
            <v-chip size="x-small" color="primary" variant="tonal" class="mt-1">{{ authStore.user?.role }}</v-chip>
          </div>
        </div>
        <v-form ref="profileForm" @submit.prevent="saveProfile">
          <v-text-field v-model="profileData.name" label="Nama" variant="outlined" density="comfortable"
            :rules="[v => !!v || 'Wajib diisi']" class="mb-3" />
          <v-btn color="primary" :loading="savingProfile" @click="saveProfile">Simpan Profil</v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card rounded="lg" elevation="1">
      <v-card-title class="pa-5 pb-2 text-body-1 font-weight-bold">Ganti Password</v-card-title>
      <v-card-text class="pa-5">
        <v-form ref="pwForm" @submit.prevent="changePassword">
          <v-text-field v-model="pwData.current_password" label="Password Saat Ini" type="password" variant="outlined"
            density="comfortable" :rules="[v => !!v || 'Wajib diisi']" class="mb-3" />
          <v-text-field v-model="pwData.password" label="Password Baru" type="password" variant="outlined"
            density="comfortable" :rules="[v => !!v || 'Wajib diisi', v => v.length >= 8 || 'Min 8 karakter']" class="mb-3" />
          <v-text-field v-model="pwData.password_confirmation" label="Konfirmasi Password Baru" type="password"
            variant="outlined" density="comfortable"
            :rules="[v => !!v || 'Wajib diisi', v => v === pwData.password || 'Password tidak cocok']" class="mb-4" />
          <v-btn color="primary" :loading="savingPw" @click="changePassword">Ganti Password</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/ui.store'

const authStore = useAuthStore()
const ui = useUiStore()
const profileForm = ref()
const pwForm = ref()
const savingProfile = ref(false)
const savingPw = ref(false)
const profileData = ref({ name: authStore.user?.name ?? '' })
const pwData = ref({ current_password: '', password: '', password_confirmation: '' })

async function saveProfile() {
  const { valid } = await profileForm.value.validate()
  if (!valid) return
  savingProfile.value = true
  try {
    const updated = await authService.updateProfile(profileData.value)
    authStore.user = updated
    ui.showSnackbar('Profil berhasil diperbarui.')
  } catch (e: any) { ui.showError(getErrorMessage(e, 'Gagal memperbarui profil.')) }
  finally { savingProfile.value = false }
}

async function changePassword() {
  const { valid } = await pwForm.value.validate()
  if (!valid) return
  savingPw.value = true
  try {
    await authService.changePassword(pwData.value)
    ui.showSnackbar('Password berhasil diubah.')
    pwData.value = { current_password: '', password: '', password_confirmation: '' }
  } catch (e: any) {
    ui.showError(getErrorMessage(e, 'Gagal mengganti password.'))
  } finally {
    savingPw.value = false
  }
}
</script>
