import api from './api'

/** Satu entri riwayat akun (audit log): nilai lama/baru per field yang berubah */
export interface UserHistoryEntry {
  id: number
  action: 'created' | 'updated'
  user: { id: number; name: string } | null
  changes: Record<string, { old: unknown; new: unknown }>
  created_at: string
}

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
  async history(id: number): Promise<UserHistoryEntry[]> {
    const { data } = await api.get(`/users/${id}/history`)
    return data.data
  },
}
