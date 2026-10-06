import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardService } from '@/services/dashboard.service'
import { useUiStore } from './ui.store'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<any>(null)
  const trendData = ref<any[]>([])
  const categoryBreakdown = ref<any[]>([])
  const topEntries = ref<any[]>([])
  const projects = ref<any[]>([])
  const targetAlerts = ref<any[]>([])
  const loading = ref(false)

  async function fetchDashboard(params = {}) {
    loading.value = true
    try {
      const [s, t, c, top, p, alerts] = await Promise.all([
        dashboardService.getSummary(params),
        dashboardService.getTrend(params),
        dashboardService.getCategoryBreakdown(params),
        dashboardService.getTopEntries(params),
        dashboardService.getProjects(params),
        dashboardService.getTargetAlerts(),
      ])
      summary.value = s
      trendData.value = t
      categoryBreakdown.value = c
      topEntries.value = top
      projects.value = p
      targetAlerts.value = alerts
    } catch {
      useUiStore().showError('Gagal memuat data dashboard.')
    } finally {
      loading.value = false
    }
  }

  // Setup store tidak punya $reset() bawaan — dipanggil saat logout agar user berikutnya tidak melihat data lama.
  function reset() {
    summary.value = null
    trendData.value = []
    categoryBreakdown.value = []
    topEntries.value = []
    projects.value = []
    targetAlerts.value = []
    loading.value = false
  }

  return { summary, trendData, categoryBreakdown, topEntries, projects, targetAlerts, loading, fetchDashboard, reset }
})
