import type { CompletenessGrid, CompletenessStatus } from '@/services/completeness.service'

export const COMPLETENESS_STATUS: Record<CompletenessStatus, { label: string; color: string; icon: string }> = {
  recorded: { label: 'Tercatat', color: 'green', icon: 'mdi-check-circle' },
  draft: { label: 'Draft', color: 'orange', icon: 'mdi-pencil-circle' },
  dismissed: { label: 'Tidak ada data', color: 'grey', icon: 'mdi-minus-circle-outline' },
  missing: { label: 'Belum diisi', color: 'error', icon: 'mdi-alert-circle' },
  none: { label: '—', color: 'grey', icon: '' },
}

/** Kekurangan data di bulan terakhir grid (bulan lalu), untuk peringatan di tab Entri; null bila lengkap */
export function lastMonthGap(grid: CompletenessGrid | null): { label: string; empty: boolean; missing: string[] } | null {
  const i = (grid?.months.length ?? 0) - 1
  if (!grid || i < 0) return null
  const month = grid.months[i]!
  const missing = grid.factors.filter(f => f.statuses[i] === 'missing').map(f => f.name)
  if (!month.empty && !missing.length) return null
  return { label: month.label, empty: month.empty, missing }
}

/** "belum ada entri sama sekali" / "belum ada Listrik PLN, Bensin" */
export function describeGap(gap: { empty: boolean; missing: string[] }): string {
  if (gap.empty) return 'belum ada entri sama sekali'
  return `belum ada ${gap.missing.join(', ')}`
}
