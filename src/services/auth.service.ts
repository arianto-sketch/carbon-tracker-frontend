import api from './api'

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    return data.data
  },
  async logout() {
    await api.post('/auth/logout')
  },
  async me() {
    const { data } = await api.get('/auth/me')
    return data.data
  },
  async updateProfile(payload: { name: string; avatar?: string }) {
    const { data } = await api.put('/auth/me', payload)
    return data.data
  },
  async changePassword(payload: { current_password: string; password: string; password_confirmation: string }) {
    await api.put('/auth/me/password', payload)
  },
}
