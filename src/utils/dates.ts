/**
 * Tanggal saran untuk entri salinan (mis. tagihan rutin): tanggal yang sama bulan berikutnya,
 * disesuaikan dengan akhir bulan (31 Jan -> 28/29 Feb), dan tidak melewati hari ini.
 * Semua tanggal dalam format YYYY-MM-DD.
 */
export function suggestCopyDate(original: string, today: string): string {
  const [year, month, day] = original.split('-').map(Number) as [number, number, number]
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate()
  const suggested = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
  return suggested > today ? today : suggested
}
