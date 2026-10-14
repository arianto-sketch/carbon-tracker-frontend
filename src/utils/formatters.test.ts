import { describe, expect, it } from 'vitest'
import { formatChange, formatCo2, formatDate, formatNumber, monthLabel, monthRangeLabel } from './formatters'

describe('formatCo2', () => {
  it('memakai kg di bawah 1000 kg dan ton mulai 1000 kg', () => {
    expect(formatCo2(0)).toBe('0.00 kg CO₂e')
    expect(formatCo2(999.994)).toBe('999.99 kg CO₂e')
    expect(formatCo2(1000)).toBe('1.00 ton CO₂e')
    expect(formatCo2(12_345)).toBe('12.35 ton CO₂e')
  })
})

describe('formatNumber', () => {
  it('memakai format angka Indonesia', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50')
    expect(formatNumber(7, 0)).toBe('7')
  })
})

describe('formatDate', () => {
  it('menampilkan "-" untuk tanggal kosong', () => {
    expect(formatDate('')).toBe('-')
  })
})

describe('monthLabel', () => {
  it('memetakan nomor bulan ke singkatan Indonesia', () => {
    expect(monthLabel(1)).toBe('Jan')
    expect(monthLabel(8)).toBe('Ags')
    expect(monthLabel(12)).toBe('Des')
  })
})

describe('formatChange', () => {
  it('memberi tanda + untuk kenaikan dan format angka Indonesia', () => {
    expect(formatChange(300)).toBe('+300,0%')
    expect(formatChange(-25.46)).toBe('-25,5%')
    expect(formatChange(0)).toBe('0,0%')
  })
})

describe('monthRangeLabel', () => {
  it('menyebut rentang bulan yang dibandingkan', () => {
    expect(monthRangeLabel(4, 2025)).toBe('Jan–Apr 2025')
    expect(monthRangeLabel(1, 2025)).toBe('Jan 2025')
    expect(monthRangeLabel(12, 2025)).toBe('2025')
  })
})
