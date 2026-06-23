import api from './api'

export const projectsService = {
  async list(params = {}) {
    const { data } = await api.get('/projects', { params })
    return data
  },
  async get(id: number) {
    const { data } = await api.get(`/projects/${id}`)
    return data.data
  },
  async create(payload: object) {
    const { data } = await api.post('/projects', payload)
    return data.data
  },
  async update(id: number, payload: object) {
    const { data } = await api.put(`/projects/${id}`, payload)
    return data.data
  },
  async remove(id: number) {
    await api.delete(`/projects/${id}`)
  },
  async getSummary(id: number) {
    const { data } = await api.get(`/projects/${id}/summary`)
    return data.data
  },
  async getMembers(id: number) {
    const { data } = await api.get(`/projects/${id}/members`)
    return data.data
  },
  async addMember(id: number, payload: { user_id: number; role?: string }) {
    const { data } = await api.post(`/projects/${id}/members`, payload)
    return data.data
  },
  async updateMember(id: number, userId: number, role: string) {
    const { data } = await api.put(`/projects/${id}/members/${userId}`, { role })
    return data.data
  },
  async removeMember(id: number, userId: number) {
    await api.delete(`/projects/${id}/members/${userId}`)
  },
}
