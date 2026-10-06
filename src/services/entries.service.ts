import api from './api'

export const entriesService = {
  async list(projectId: number, params = {}) {
    const { data } = await api.get(`/projects/${projectId}/entries`, { params })
    return data
  },
  async get(projectId: number, id: number) {
    const { data } = await api.get(`/projects/${projectId}/entries/${id}`)
    return data.data
  },
  async create(projectId: number, payload: object) {
    const { data } = await api.post(`/projects/${projectId}/entries`, payload)
    return data.data
  },
  async update(projectId: number, id: number, payload: object) {
    const { data } = await api.put(`/projects/${projectId}/entries/${id}`, payload)
    return data.data
  },
  async remove(projectId: number, id: number) {
    await api.delete(`/projects/${projectId}/entries/${id}`)
  },
  async submit(projectId: number, id: number) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/submit`)
    return data.data
  },
  async approve(projectId: number, id: number) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/approve`)
    return data.data
  },
  async history(projectId: number, id: number) {
    const { data } = await api.get(`/projects/${projectId}/entries/${id}/history`)
    return data.data
  },
  async reject(projectId: number, id: number, reason: string) {
    const { data } = await api.post(`/projects/${projectId}/entries/${id}/reject`, { reason })
    return data.data
  },
  async bulk(projectId: number, entries: object[]) {
    const { data } = await api.post(`/projects/${projectId}/entries/bulk`, { entries })
    return data.data
  },
}
