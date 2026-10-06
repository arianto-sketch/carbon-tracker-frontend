import api from './api'

export const targetsService = {
  async list(projectId: number) {
    const { data } = await api.get(`/projects/${projectId}/targets`)
    return data.data
  },
  async get(projectId: number, id: number) {
    const { data } = await api.get(`/projects/${projectId}/targets/${id}`)
    return data.data
  },
  async create(projectId: number, payload: object) {
    const { data } = await api.post(`/projects/${projectId}/targets`, payload)
    return data.data
  },
  async update(projectId: number, id: number, payload: object) {
    const { data } = await api.put(`/projects/${projectId}/targets/${id}`, payload)
    return data.data
  },
  async remove(projectId: number, id: number) {
    await api.delete(`/projects/${projectId}/targets/${id}`)
  },
  async getProgress(projectId: number) {
    const { data } = await api.get(`/projects/${projectId}/targets/progress`)
    return data.data
  },
}
