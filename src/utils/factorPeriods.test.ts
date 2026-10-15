import { describe, expect, it } from 'vitest'
import { formatFactor, valueOn, type FactorPeriod } from './factorPeriods'

// Urutan dari API: terbaru dulu
const periods: FactorPeriod[] = [
  { id: 3, valid_from: '2025-01-01', valid_until: null, factor_value: 0.8, source: 'ESDM 2025' },
  { id: 1, valid_from: '2000-01-01', valid_until: '2024-12-31', factor_value: 0.87, source: null },
]

describe('valueOn', () => {
  it('memakai periode yang berlaku pada tanggal tersebut', () => {
    expect(valueOn(periods, '2024-12-31')).toBe(0.87)
    expect(valueOn(periods, '2025-01-01')).toBe(0.8)
    expect(valueOn(periods, '2026-06-15')).toBe(0.8)
  })

  it('tanggal sebelum periode pertama memakai periode pertama', () => {
    expect(valueOn(periods, '1999-05-01')).toBe(0.87)
  })

  it('tanpa periode atau tanggal: null', () => {
    expect(valueOn([], '2025-01-01')).toBeNull()
    expect(valueOn(periods, '')).toBeNull()
  })
})

describe('formatFactor', () => {
  it('tanpa nol berlebih dengan koma desimal', () => {
    expect(formatFactor(2.5)).toBe('2,5')
    expect(formatFactor(0.00012)).toBe('0,00012')
    expect(formatFactor(3)).toBe('3')
  })
})
