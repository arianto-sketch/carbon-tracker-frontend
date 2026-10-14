import { monthRangeLabel } from './formatters'

/** Respons GET /dashboard/outlook */
export interface Outlook {
  year: number
  months_elapsed: number
  ytd_co2e_kg: number
  projected_annual_co2e_kg: number | null
  previous_year: { year: number; same_period_co2e_kg: number; full_year_co2e_kg: number }
  yoy_change_pct: number | null
}

/** Keterangan angka proyeksi: run-rate untuk tahun berjalan, total aktual untuk tahun penuh */
export function projectionCaption(o: Outlook): string {
  if (o.months_elapsed === 0) return `Tahun ${o.year} belum berjalan`
  return o.months_elapsed >= 12 ? `Total akhir ${o.year}` : `Proyeksi akhir ${o.year} (run-rate ${o.months_elapsed} bulan)`
}

/** Periode pembanding perubahan YoY, atau alasan perubahan tidak bisa dihitung */
export function comparisonCaption(o: Outlook): string {
  if (o.months_elapsed === 0) return `Tahun ${o.year} belum berjalan`
  if (o.yoy_change_pct === null) return `Belum ada data pembanding ${o.previous_year.year}`
  return `vs ${monthRangeLabel(o.months_elapsed, o.previous_year.year)}`
}

/** Arah perubahan sesuai tampilannya (1 desimal): emisi naik = buruk, turun = baik */
export function changeTone(pct: number): 'up' | 'down' | 'flat' {
  const shown = Math.round(pct * 10) / 10
  if (shown > 0) return 'up'
  if (shown < 0) return 'down'
  return 'flat'
}
