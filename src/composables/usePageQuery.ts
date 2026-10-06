import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Nomor halaman yang disimpan di query URL (?page=2) supaya bisa di-refresh/dibagikan.
 * Halaman 1 tidak ditulis ke URL.
 */
export function usePageQuery(key = 'page') {
  const route = useRoute()
  const router = useRouter()

  return computed<number>({
    get: () => Math.max(1, Number(route.query[key]) || 1),
    set: (value) => {
      router.replace({ query: { ...route.query, [key]: value > 1 ? String(value) : undefined } })
    },
  })
}
