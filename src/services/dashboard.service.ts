import api from './api'

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
  async getTopEntries(params = {}) {
    const { data } = await api.get('/dashboard/top-entries', { params })
    return data.data
  },
}
