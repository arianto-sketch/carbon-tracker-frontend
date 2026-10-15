import { describe, expect, it } from 'vitest'
import { suggestCopyDate } from './dates'

describe('suggestCopyDate', () => {
  it('menyarankan tanggal yang sama bulan berikutnya', () => {
    expect(suggestCopyDate('2026-08-15', '2026-10-15')).toBe('2026-09-15')
  })

  it('tanggal akhir bulan disesuaikan dengan panjang bulan berikutnya', () => {
    expect(suggestCopyDate('2026-01-31', '2026-10-15')).toBe('2026-02-28')
    expect(suggestCopyDate('2024-01-31', '2026-10-15')).toBe('2024-02-29')
    expect(suggestCopyDate('2026-12-20', '2027-06-01')).toBe('2027-01-20')
  })

  it('tidak pernah di masa depan (entri tidak boleh bertanggal setelah hari ini)', () => {
    expect(suggestCopyDate('2026-10-10', '2026-10-15')).toBe('2026-10-15')
  })
})
