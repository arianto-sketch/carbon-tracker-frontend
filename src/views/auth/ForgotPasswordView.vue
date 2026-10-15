<template>
  <auth-layout>
    <v-card elevation="2" rounded="lg">
      <v-card-text class="pa-6">
        <h2 class="text-h6 font-weight-bold mb-2">Lupa Password</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Masukkan email akun Anda. Kami akan mengirim link untuk mengatur password baru.
        </p>

        <v-alert v-if="sentMessage" type="success" variant="tonal" density="compact" class="mb-4">
          {{ sentMessage }} Periksa juga folder spam.
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            autocomplete="email"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Email wajib diisi', v => /.+@.+/.test(v) || 'Format email tidak valid']"
            class="mb-2"
          />
          <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">{{ errorMsg }}</v-alert>
          <v-btn type="submit" color="primary" block size="large" :loading="sending">Kirim link reset</v-btn>
        </v-form>

        <div class="text-center mt-4">
          <router-link to="/login" class="text-body-2">Kembali ke halaman masuk</router-link>
        </div>
      </v-card-text>
    </v-card>
  </auth-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'

const formRef = ref()
const email = ref('')
const sending = ref(false)
const sentMessage = ref('')
const errorMsg = ref('')

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  sending.value = true
  errorMsg.value = ''
  try {
    sentMessage.value = await authService.forgotPassword(email.value)
  } catch (e: any) {
    errorMsg.value = getErrorMessage(e, 'Gagal mengirim link reset. Coba lagi.')
  } finally {
    sending.value = false
  }
}
</script>
