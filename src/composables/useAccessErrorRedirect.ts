import { useRoute, useRouter } from 'vue-router'

/**
 * Arahkan error akses dari API ke halaman yang sesuai: 403 -> /403, 404 -> halaman 404 (URL tetap).
 * Respons yang datang setelah user pindah halaman diabaikan supaya tidak "menyeret" user kembali.
 * Mengembalikan true bila error sudah ditangani (pemanggil tidak perlu menampilkan snackbar).
 */
export function useAccessErrorRedirect() {
  const route = useRoute()
  const router = useRouter()
  const startPath = route.path

  return function handleAccessError(error: any): boolean {
    if (route.path !== startPath) return true

    const status = error?.response?.status
    if (status === 403) {
      router.replace('/403')
      return true
    }
    if (status === 404) {
      const segments = startPath.split('/').filter(Boolean).map((s) => {
        try { return decodeURIComponent(s) } catch { return s }
      })
      router.replace({ name: 'not-found', params: { pathMatch: segments } })
      return true
    }
    return false
  }
}
