<template>
  <auth-layout>
    <v-card elevation="2" rounded="lg">
      <v-card-text class="pa-6">
        <h2 class="text-h6 font-weight-bold mb-4">Masuk ke Akun</h2>
        <v-form ref="formRef" @submit.prevent="handleLogin">
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Email wajib diisi', v => /.+@.+/.test(v) || 'Format email tidak valid']"
            class="mb-2"
          />
          <v-text-field
            v-model="form.password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Password wajib diisi']"
            class="mb-4"
          />
          <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">
            {{ errorMsg }}
          </v-alert>
          <v-btn type="submit" color="primary" block size="large" :loading="authStore.loading">
            Masuk
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </auth-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/services/api'
import AuthLayout from '@/layouts/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const formRef = ref()
const showPassword = ref(false)
const errorMsg = ref('')
const form = ref({ email: '', password: '' })

async function handleLogin() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  errorMsg.value = ''
  try {
    await authStore.login(form.value.email, form.value.password)
    // Kembali ke halaman tujuan semula; hanya path internal (diawali '/', bukan '//').
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
    router.push(target)
  } catch (e: any) {
    errorMsg.value = getErrorMessage(e, 'Login gagal. Periksa email dan password.')
  }
}
</script>
