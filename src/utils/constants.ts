export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export const ENTRY_STATUS_COLORS: Record<string, string> = {
  draft: 'grey',
  submitted: 'orange',
  approved: 'green',
}

export const ENTRY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Menunggu Approval',
  approved: 'Disetujui',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'green',
  completed: 'blue',
  archived: 'grey',
}
