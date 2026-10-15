import api from './api'
import type { FactorPeriod } from '@/utils/factorPeriods'

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

  // Nilai faktor per periode. meta.recalculated = entri draft/ditolak yang dihitung ulang;
  // meta.locked = entri yang sudah diajukan/disetujui dan tetap memakai nilai lama.
  async factorValues(id: number): Promise<{ data: FactorPeriod[]; meta: { locked: number } }> {
    const { data } = await api.get(`/emission-factors/${id}/values`)
    return data
  },
  async addFactorValue(id: number, payload: { valid_from: string; factor_value: number; source?: string | null }): Promise<PeriodChange> {
    const { data } = await api.post(`/emission-factors/${id}/values`, payload)
    return data.meta
  },
  async updateFactorValue(id: number, valueId: number, payload: { factor_value: number; source?: string | null }): Promise<PeriodChange> {
    const { data } = await api.put(`/emission-factors/${id}/values/${valueId}`, payload)
    return data.meta
  },
  async deleteFactorValue(id: number, valueId: number): Promise<PeriodChange> {
    const { data } = await api.delete(`/emission-factors/${id}/values/${valueId}`)
    return data.meta
  },
}

export interface PeriodChange {
  recalculated: number
  locked: number
}
