import api from './api'
import type { InitiativeSummary } from './initiatives.service'

export const dashboardService = {
  async getSummary(params = {}) {
    const { data } = await api.get('/dashboard/summary', { params })
    return data.data
  },
  // Target tahun berjalan dengan pemakaian >= 80% (tidak mengikuti filter tahun dashboard)
  async getTargetAlerts() {
    const { data } = await api.get('/dashboard/target-alerts')
    return data.data
  },
  // Rencana aksi reduksi seluruh project yang bisa diakses (tidak mengikuti filter tahun)
  async getInitiatives(params = {}): Promise<InitiativeSummary> {
    const { data } = await api.get('/dashboard/initiatives', { params })
    return data.data
  },
  async getProjects(params = {}) {
    const { data } = await api.get('/dashboard/projects', { params })
    return data.data
  },
  async getTrend(params = {}) {
    const { data } = await api.get('/dashboard/trend', { params })
    return data.data
  },
  async getCategoryBreakdown(params = {}) {
    const { data } = await api.get('/dashboard/category-breakdown', { params })
    return data.data
  },
  async getScopeBreakdown(params = {}) {
    const { data } = await api.get('/dashboard/scope-breakdown', { params })
    return data.data
  },
  // Total s.d. bulan berjalan, proyeksi run-rate linear, dan pembanding periode sama tahun lalu
  async getOutlook(params = {}) {
    const { data } = await api.get('/dashboard/outlook', { params })
    return data.data
  },
  async getTopEntries(params = {}) {
    const { data } = await api.get('/dashboard/top-entries', { params })
    return data.data
  },
}
