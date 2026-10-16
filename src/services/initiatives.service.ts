import api from './api'

export type InitiativeStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'

export interface Initiative {
  id: number
  project_id: number
  title: string
  description: string | null
  category: { id: number; name: string } | null
  /** Estimasi penghematan per tahun */
  estimated_reduction_kg: number
  status: InitiativeStatus
  pic: { id: number; name: string } | null
  target_date: string | null
  completed_at: string | null
}

export interface InitiativePayload {
  title: string
  description: string | null
  category_id: number | null
  estimated_reduction_kg: number
  status: InitiativeStatus
  pic_user_id: number | null
  target_date: string | null
}

/** Estimasi reduksi per tahun: yang direncanakan/berjalan dan yang sudah selesai */
export interface InitiativeTotals {
  planned_kg: number
  done_kg: number
}

export interface InitiativeSummary extends InitiativeTotals {
  counts: Record<InitiativeStatus, number>
}

export const initiativesService = {
  async list(projectId: number): Promise<{ data: Initiative[]; meta: InitiativeTotals }> {
    const { data } = await api.get(`/projects/${projectId}/initiatives`)
    return data
  },
  async create(projectId: number, payload: InitiativePayload): Promise<Initiative> {
    const { data } = await api.post(`/projects/${projectId}/initiatives`, payload)
    return data.data
  },
  async update(projectId: number, id: number, payload: InitiativePayload): Promise<Initiative> {
    const { data } = await api.put(`/projects/${projectId}/initiatives/${id}`, payload)
    return data.data
  },
  async remove(projectId: number, id: number) {
    await api.delete(`/projects/${projectId}/initiatives/${id}`)
  },
}
