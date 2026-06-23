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

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function monthLabel(month: number): string {
  return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][month - 1]
}
