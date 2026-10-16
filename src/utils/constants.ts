export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export const ENTRY_STATUS_COLORS: Record<string, string> = {
  draft: 'grey',
  submitted: 'orange',
  approved: 'green',
  rejected: 'red',
}

export const ENTRY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Menunggu Approval',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  completed: 'blue',
  archived: 'grey',
}

// Label periode target (dipakai dashboard & daftar target)
export const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Bulan',
  quarterly: 'Kuartal',
  yearly: 'Tahunan',
}

// Scope GHG Protocol per faktor emisi (disalin ke entri saat dicatat)
export const GHG_SCOPES: Record<number, string> = {
  1: 'Emisi langsung',
  2: 'Energi yang dibeli',
  3: 'Tidak langsung lainnya',
}

export const GHG_SCOPE_OPTIONS = Object.keys(GHG_SCOPES).map(Number).map(scope => ({ title: scopeLabel(scope), value: scope }))

/** "Scope 2 · Energi yang dibeli" */
export function scopeLabel(scope: number): string {
  return `Scope ${scope} · ${GHG_SCOPES[scope] ?? '-'}`
}

export const GHG_SCOPE_COLORS: Record<number, string> = { 1: 'deep-orange', 2: 'amber-darken-2', 3: 'blue' }

// Role anggota di dalam project (berbeda dengan role global user)
export const PROJECT_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  member: 'Member',
  viewer: 'Viewer',
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  archived: 'Diarsipkan',
}

// Status inisiatif rencana aksi reduksi
export const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  planned: 'Direncanakan',
  in_progress: 'Berjalan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const INITIATIVE_STATUS_COLORS: Record<string, string> = {
  planned: 'blue',
  in_progress: 'orange',
  done: 'green',
  cancelled: 'grey',
}
