import api from './api'

/** recorded = diajukan/disetujui, draft = hanya draft/ditolak, missing = faktor rutin belum dicatat */
export type CompletenessStatus = 'recorded' | 'draft' | 'dismissed' | 'missing' | 'none'

export interface CompletenessMonth {
  year: number
  month: number
  label: string
  /** Project aktif tanpa entri sama sekali (dan belum ditandai "tidak ada data") */
  empty: boolean
  /** Seluruh project ditandai "tidak ada data" */
  dismissed: boolean
  missing_count: number
}

export interface CompletenessFactor {
  id: number
  name: string
  /** Satu status per bulan, urutan sama dengan months */
  statuses: CompletenessStatus[]
}

export interface CompletenessGrid {
  months: CompletenessMonth[]
  factors: CompletenessFactor[]
}

/** Bulan + faktor yang ditandai; tanpa faktor = seluruh project */
export interface GapTarget {
  period_year: number
  period_month: number
  emission_factor_id?: number | null
}

export interface DashboardCompleteness {
  period: string
  period_label: string
  active_count: number
  incomplete: { id: number; name: string; empty: boolean; missing_factors: string[] }[]
}

export const completenessService = {
  async grid(projectId: number): Promise<CompletenessGrid> {
    const { data } = await api.get(`/projects/${projectId}/data-completeness`)
    return data.data
  },
  async dismiss(projectId: number, target: GapTarget) {
    await api.post(`/projects/${projectId}/data-gaps/dismissals`, target)
  },
  async undismiss(projectId: number, target: GapTarget) {
    // Tanpa emission_factor_id = seluruh project
    const { emission_factor_id, ...period } = target
    await api.delete(`/projects/${projectId}/data-gaps/dismissals`, {
      params: emission_factor_id == null ? period : { ...period, emission_factor_id },
    })
  },
}
