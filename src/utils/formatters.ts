export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} ton CO₂e`
  return `${kg.toFixed(2)} kg CO₂e`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function monthLabel(month: number): string {
  return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][month - 1]
}

/** Perubahan persen bertanda, mis. "+300,0%" atau "-25,5%" */
export function formatChange(pct: number): string {
  return `${pct > 0 ? '+' : ''}${formatNumber(pct, 1)}%`
}

/** Rentang Januari s.d. bulan ke-n: "Jan–Apr 2025", "Jan 2025", atau "2025" bila setahun penuh */
export function monthRangeLabel(months: number, year: number): string {
  if (months >= 12) return String(year)
  if (months <= 1) return `Jan ${year}`
  return `Jan–${monthLabel(months)} ${year}`
}
