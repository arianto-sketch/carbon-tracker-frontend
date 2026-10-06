import api from './api'

export const usersService = {
  async list(params = {}) {
    const { data } = await api.get('/users', { params })
    return data
  },
  async create(payload: object) {
    const { data } = await api.post('/users', payload)
    return data.data
  },
  async update(id: number, payload: object) {
    const { data } = await api.put(`/users/${id}`, payload)
    return data.data
  },
}
