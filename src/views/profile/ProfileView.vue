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

    <v-card rounded="lg" elevation="1" class="mb-4">
      <v-card-title class="pa-5 pb-2 text-body-1 font-weight-bold">Notifikasi</v-card-title>
      <v-card-text class="pa-5 pt-0">
        <v-switch v-model="preferences.email_notifications" label="Kirim notifikasi email" color="primary" density="comfortable"
          :loading="saving === 'email_notifications'" :disabled="saving !== null" persistent-hint
          hint="Email saat entri menunggu approval Anda, disetujui, atau ditolak. Notifikasi di aplikasi tetap muncul."
          @update:model-value="(v: boolean | null) => savePreference('email_notifications', v)" />
        <!-- Role global Viewer tidak pernah menerima ringkasan (hanya owner project dan admin) -->
        <v-switch v-if="authStore.user?.role !== 'viewer'" v-model="preferences.monthly_summary_email"
          label="Kirim email ringkasan bulanan" color="primary" density="comfortable" class="mt-2"
          :loading="saving === 'monthly_summary_email'" :disabled="saving !== null" persistent-hint
          hint="Setiap tanggal 1 untuk owner project dan admin: emisi bulan lalu per project, entri menunggu review, dan target yang hampir terlampaui."
          @update:model-value="(v: boolean | null) => savePreference('monthly_summary_email', v)" />
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

// Disimpan langsung saat diubah; nama yang dikirim adalah nama tersimpan, bukan isian form di atas
type Preference = 'email_notifications' | 'monthly_summary_email'
const PREFERENCE_MESSAGES: Record<Preference, { on: string; off: string }> = {
  email_notifications: { on: 'Notifikasi email dinyalakan.', off: 'Notifikasi email dimatikan.' },
  monthly_summary_email: { on: 'Email ringkasan bulanan dinyalakan.', off: 'Email ringkasan bulanan dimatikan.' },
}
const preferences = ref<Record<Preference, boolean>>({
  email_notifications: authStore.user?.email_notifications ?? true,
  monthly_summary_email: authStore.user?.monthly_summary_email ?? true,
})
// Satu per satu: keduanya dikirim lewat PUT /auth/me yang sama
const saving = ref<Preference | null>(null)

async function savePreference(key: Preference, value: boolean | null) {
  const enabled = !!value
  saving.value = key
  try {
    authStore.user = await authService.updateProfile({ name: authStore.user.name, [key]: enabled })
    ui.showSnackbar(enabled ? PREFERENCE_MESSAGES[key].on : PREFERENCE_MESSAGES[key].off)
  } catch (e: any) {
    preferences.value[key] = !enabled
    ui.showError(getErrorMessage(e, 'Gagal menyimpan preferensi notifikasi.'))
  } finally {
    saving.value = null
  }
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
