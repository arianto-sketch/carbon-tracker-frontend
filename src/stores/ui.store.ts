import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const snackbar = ref({ show: false, message: '', color: 'success' })
  const loading = ref(false)

  function showSnackbar(message: string, color = 'success') {
    snackbar.value = { show: true, message, color }
  }

  function showError(message: string) {
    showSnackbar(message, 'error')
  }

  return { snackbar, loading, showSnackbar, showError }
})
