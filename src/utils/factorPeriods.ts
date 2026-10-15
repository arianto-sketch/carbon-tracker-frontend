/** Satu periode nilai faktor emisi (GET /emission-factors/{id}/values) */
export interface FactorPeriod {
  id: number
  valid_from: string
  valid_until: string | null
  factor_value: number
  source: string | null
}

/**
 * Nilai yang berlaku pada tanggal (YYYY-MM-DD), sama dengan aturan backend: periode dengan
 * valid_from terakhir yang <= tanggal; tanggal sebelum periode pertama memakai periode pertama.
 */
export function valueOn(periods: FactorPeriod[], date: string): number | null {
  if (!periods.length || !date) return null
  const ascending = [...periods].sort((a, b) => a.valid_from.localeCompare(b.valid_from))
  const valid = ascending.filter(p => p.valid_from <= date)
  return (valid.length ? valid[valid.length - 1] : ascending[0])!.factor_value
}

/** Periode pertama dari backend berlaku untuk semua tanggal sebelumnya juga */
export const FIRST_VALID_FROM = '2000-01-01'

/** Nilai faktor tanpa nol berlebih, format Indonesia: 0,87 / 2,5 / 0,00012 */
export function formatFactor(value: number): string {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 8 })
}
