import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardCompleteness } from '@/services/completeness.service'
import type { InitiativeSummary } from '@/services/initiatives.service'
import { useUiStore } from './ui.store'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<any>(null)
  const trendData = ref<any[]>([])
  const categoryBreakdown = ref<any[]>([])
  const scopeBreakdown = ref<any[]>([])
  const outlook = ref<any>(null)
  const topEntries = ref<any[]>([])
  const projects = ref<any[]>([])
  const targetAlerts = ref<any[]>([])
  const initiatives = ref<InitiativeSummary | null>(null)
  const dataCompleteness = ref<DashboardCompleteness | null>(null)
  const loading = ref(false)

  // Tiap bagian dimuat sendiri-sendiri: satu endpoint gagal tidak mengosongkan seluruh dashboard
  async function fetchDashboard(params = {}) {
    loading.value = true
    const results = await Promise.allSettled([
      dashboardService.getSummary(params).then(v => { summary.value = v }),
      dashboardService.getTrend(params).then(v => { trendData.value = v }),
      dashboardService.getCategoryBreakdown(params).then(v => { categoryBreakdown.value = v }),
      dashboardService.getScopeBreakdown(params).then(v => { scopeBreakdown.value = v }),
      dashboardService.getOutlook(params).then(v => { outlook.value = v }),
      dashboardService.getTopEntries(params).then(v => { topEntries.value = v }),
      dashboardService.getProjects(params).then(v => { projects.value = v }),
      dashboardService.getTargetAlerts().then(v => { targetAlerts.value = v }),
      dashboardService.getInitiatives().then(v => { initiatives.value = v }),
      dashboardService.getDataCompleteness().then(v => { dataCompleteness.value = v }),
    ])
    loading.value = false

    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === results.length) useUiStore().showError('Gagal memuat data dashboard.')
    else if (failed > 0) useUiStore().showError('Sebagian data dashboard gagal dimuat.')
  }

  // Setup store tidak punya $reset() bawaan — dipanggil saat logout agar user berikutnya tidak melihat data lama.
  function reset() {
    summary.value = null
    trendData.value = []
    categoryBreakdown.value = []
    scopeBreakdown.value = []
    outlook.value = null
    topEntries.value = []
    projects.value = []
    targetAlerts.value = []
    initiatives.value = null
    dataCompleteness.value = null
    loading.value = false
  }

  return {
    summary, trendData, categoryBreakdown, scopeBreakdown, outlook, topEntries, projects, targetAlerts, initiatives,
    dataCompleteness, loading, fetchDashboard, reset,
  }
})
