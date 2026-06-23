import api from './api'

export const categoriesService = {
  async listCategories() {
    const { data } = await api.get('/emission-categories')
    return data.data
  },
  async listFactors(params = {}) {
    const { data } = await api.get('/emission-factors', { params })
    return data
  },
  async createFactor(payload: object) {
    const { data } = await api.post('/emission-factors', payload)
    return data.data
  },
  async updateFactor(id: number, payload: object) {
    const { data } = await api.put(`/emission-factors/${id}`, payload)
    return data.data
  },
  async deleteFactor(id: number) {
    await api.delete(`/emission-factors/${id}`)
  },
}
