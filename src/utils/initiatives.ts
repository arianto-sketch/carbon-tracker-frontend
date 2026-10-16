import { formatCo2 } from './formatters'

/** Status yang masih dihitung sebagai potensi reduksi (sama dengan backend) */
export const OPEN_INITIATIVE_STATUSES = ['planned', 'in_progress']

/** Inisiatif yang belum selesai/dibatalkan dan target tanggalnya (YYYY-MM-DD) sudah lewat */
export function isOverdue(initiative: { status: string; target_date: string | null }, today: string): boolean {
  return !!initiative.target_date
    && OPEN_INITIATIVE_STATUSES.includes(initiative.status)
    && initiative.target_date < today
}

/** "57.75 kg CO₂e/orang"; "-" bila jumlah anggota tim belum diisi */
export function formatIntensity(kgPerPerson: number | null | undefined): string {
  return kgPerPerson == null ? '-' : `${formatCo2(kgPerPerson)}/orang`
}
