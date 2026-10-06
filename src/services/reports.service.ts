import api from './api'

function parseFilename(disposition?: string): string | null {
  if (!disposition) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition)
  if (encoded) {
    try { return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, '')) } catch { /* abaikan, coba filename biasa */ }
  }
  const plain = /filename\s*=\s*("([^"]+)"|[^;]+)/.exec(disposition)
  if (plain) return (plain[2] ?? plain[1]).trim()
  return null
}

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
    try {
      const response = await api.get(`/reports/download/${jobId}`, { responseType: 'blob' })
      const filename = parseFilename(response.headers['content-disposition'])
        ?? fallbackName
        ?? `laporan-${jobId}.${format}`
      return { blob: response.data as Blob, filename }
    } catch (err: any) {
      // Dengan responseType 'blob', body error JSON juga berupa Blob — ubah ke objek agar pesannya terbaca.
      const body = err?.response?.data
      if (body instanceof Blob) {
        try { err.response.data = JSON.parse(await body.text()) } catch { /* bukan JSON */ }
      }
      throw err
    }
  },
  async getHistory() {
    const { data } = await api.get('/reports/history')
    return data
  },
}
