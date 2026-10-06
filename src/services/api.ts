import axios from 'axios'
import { API_BASE_URL } from '@/utils/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const { pathname, search, hash } = window.location
      if (pathname !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(pathname + search + hash)}`
      }
    }
    return Promise.reject(error)
  },
)

// Ambil pesan error yang ramah user dari response API (format Laravel 422: { message, errors: { field: [msg] } }).
// Prioritas: pesan pertama tiap field di `errors` (digabung) → `message` → fallback.
export function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as any)?.response?.data
  const errors = data?.errors
  if (errors && typeof errors === 'object') {
    const messages = Object.values(errors)
      .map((v) => (Array.isArray(v) ? v[0] : v))
      .filter((m): m is string => typeof m === 'string' && m.length > 0)
    if (messages.length) return messages.join(' ')
  }
  if (typeof data?.message === 'string' && data.message) return data.message
  return fallback
}

export default api
