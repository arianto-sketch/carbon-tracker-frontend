import api from './api'
import { fetchFile } from './download'

export const reportsService = {
  async generate(payload: object) {
    const { data } = await api.post('/reports/generate', payload)
    return data.data
  },
  async getStatus(jobId: number) {
    const { data } = await api.get(`/reports/jobs/${jobId}`)
    return data.data
  },
  // Download lewat axios (membawa Bearer token). Nama file diambil dari Content-Disposition,
  // lalu fallbackName, lalu `laporan-<jobId>.<format>`.
  async download(jobId: number, format = 'xlsx', fallbackName?: string | null) {
    return fetchFile(`/reports/download/${jobId}`, fallbackName ?? `laporan-${jobId}.${format}`)
  },
  async getHistory() {
    const { data } = await api.get('/reports/history')
    return data
  },
}
