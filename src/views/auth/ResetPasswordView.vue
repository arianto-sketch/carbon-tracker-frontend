<template>
  <auth-layout>
    <v-card elevation="2" rounded="lg">
      <v-card-text class="pa-6">
        <h2 class="text-h6 font-weight-bold mb-4">Atur Password Baru</h2>

        <!-- Link dari email selalu membawa token dan email; tanpa itu form tidak bisa dipakai -->
        <template v-if="!token">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            Link reset tidak lengkap. Buka link dari email secara utuh, atau minta link baru.
          </v-alert>
          <v-btn color="primary" block to="/forgot-password">Minta link baru</v-btn>
        </template>

        <v-form v-else ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            autocomplete="username"
            variant="outlined"
            density="comfortable"
            readonly
            class="mb-2"
          />
          <v-text-field
            v-model="password"
            label="Password baru"
            type="password"
            autocomplete="new-password"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Wajib diisi', v => v.length >= 8 || 'Minimal 8 karakter']"
            class="mb-2"
          />
          <v-text-field
            v-model="confirmation"
            label="Ulangi password baru"
            type="password"
            autocomplete="new-password"
            variant="outlined"
            density="comfortable"
            :rules="[v => v === password || 'Password tidak sama']"
            class="mb-2"
          />
          <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">
            {{ errorMsg }}
            <router-link v-if="tokenRejected" to="/forgot-password" class="d-block mt-1">Minta link baru</router-link>
          </v-alert>
          <v-btn type="submit" color="primary" block size="large" :loading="saving">Simpan password baru</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </auth-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'

const route = useRoute()
const router = useRouter()
// Link email: /reset-password#token=...&email=... (fragment tidak dikirim ke server/log)
const linkParams = new URLSearchParams(route.hash.replace(/^#/, ''))
const token = linkParams.get('token') ?? ''
const email = ref(linkParams.get('email') ?? '')
// Token tidak perlu terlihat di address bar/riwayat browser setelah dibaca
if (token) router.replace({ path: route.path, hash: '' })
const formRef = ref()
const password = ref('')
const confirmation = ref('')
const saving = ref(false)
const errorMsg = ref('')
const tokenRejected = ref(false)

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  errorMsg.value = ''
  try {
    await authService.resetPassword({
      token, email: email.value, password: password.value, password_confirmation: confirmation.value,
    })
    // Hanya penanda tetap di URL (bukan teks pesan), supaya halaman login tidak bisa dipakai menampilkan teks sembarang
    router.replace({ path: '/login', query: { reset: '1' } })
  } catch (e: any) {
    tokenRejected.value = !!e?.response?.data?.errors?.email
    errorMsg.value = getErrorMessage(e, 'Gagal mengatur password baru.')
  } finally {
    saving.value = false
  }
}
</script>
