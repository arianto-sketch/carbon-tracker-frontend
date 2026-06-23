import api from './api'

export const reportsService = {
  async generate(payload: object) {
    const { data } = await api.post('/reports/generate', payload)
    return data.data
  },
  async getStatus(jobId: number) {
    const { data } = await api.get(`/reports/jobs/${jobId}`)
    return data.data
  },
  async getDownloadUrl(jobId: number) {
    return `${api.defaults.baseURL}/reports/download/${jobId}`
  },
  async getHistory() {
    const { data } = await api.get('/reports/history')
    return data
  },
}
