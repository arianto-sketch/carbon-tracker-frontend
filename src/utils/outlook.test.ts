import { describe, expect, it } from 'vitest'
import { changeTone, comparisonCaption, projectionCaption, type Outlook } from './outlook'

const outlook = (overrides: Partial<Outlook> = {}): Outlook => ({
  year: 2026,
  months_elapsed: 4,
  ytd_co2e_kg: 924,
  projected_annual_co2e_kg: 2772,
  previous_year: { year: 2025, same_period_co2e_kg: 231, full_year_co2e_kg: 1155 },
  yoy_change_pct: 300,
  ...overrides,
})

describe('projectionCaption', () => {
  it('menyebut run-rate untuk tahun berjalan dan total untuk tahun penuh', () => {
    expect(projectionCaption(outlook())).toBe('Proyeksi akhir 2026 (run-rate 4 bulan)')
    expect(projectionCaption(outlook({ months_elapsed: 12 }))).toBe('Total akhir 2026')
  })

  it('menjelaskan tahun yang belum berjalan', () => {
    expect(projectionCaption(outlook({ year: 2027, months_elapsed: 0, projected_annual_co2e_kg: null }))).toBe('Tahun 2027 belum berjalan')
  })
})

describe('comparisonCaption', () => {
  it('menyebut periode pembanding tahun lalu', () => {
    expect(comparisonCaption(outlook())).toBe('vs Jan–Apr 2025')
    expect(comparisonCaption(outlook({ months_elapsed: 12 }))).toBe('vs 2025')
  })

  it('membedakan tahun belum berjalan dengan pembanding yang kosong', () => {
    expect(comparisonCaption(outlook({ year: 2027, months_elapsed: 0, yoy_change_pct: null }))).toBe('Tahun 2027 belum berjalan')
    expect(comparisonCaption(outlook({ yoy_change_pct: null }))).toBe('Belum ada data pembanding 2025')
  })
})

describe('changeTone', () => {
  it('naik, turun, atau tetap', () => {
    expect(changeTone(12.5)).toBe('up')
    expect(changeTone(-3)).toBe('down')
    expect(changeTone(0)).toBe('flat')
    // Dibulatkan ke 1 desimal seperti tampilannya: -0,04% tampil 0,0%
    expect(changeTone(-0.04)).toBe('flat')
  })
})
