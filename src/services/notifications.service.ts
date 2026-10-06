import api from './api'

export const notificationsService = {
  async list(params = {}) {
    const { data } = await api.get('/notifications', { params })
    return data
  },
  async markRead(id: string) {
    const { data } = await api.post(`/notifications/${id}/read`)
    return data.data
  },
  async markAllRead() {
    await api.post('/notifications/read-all')
  },
}
