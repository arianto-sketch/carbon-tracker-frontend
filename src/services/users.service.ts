import api from './api'

/** Satu entri riwayat akun (audit log): nilai lama/baru per field yang berubah */
export interface UserHistoryEntry {
  id: number
  action: 'created' | 'updated' | 'password_reset_link_sent' | 'password_reset'
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
  async sendPasswordResetLink(id: number): Promise<string> {
    const { data } = await api.post(`/users/${id}/password-reset-link`)
    return data.message
  },
  /** Cari user aktif untuk dijadikan anggota project (owner PM/admin) */
  async lookup(search: string): Promise<UserLookup[]> {
    const { data } = await api.get('/users/lookup', { params: { search } })
    return data.data
  },
}

export interface UserLookup {
  id: number
  name: string
  email: string
  role: 'admin' | 'pm' | 'viewer'
}
