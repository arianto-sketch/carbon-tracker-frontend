import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import { useDashboardStore } from './dashboard.store'
import { useNotificationsStore } from './notifications.store'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const data = await authService.login(email, password)
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try { await authService.logout() } catch {}
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    useDashboardStore().reset()
    useNotificationsStore().reset()
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      user.value = await authService.me()
    } catch {
      await logout()
    }
  }

  return { user, token, loading, isAuthenticated, isAdmin, login, logout, fetchMe }
})
