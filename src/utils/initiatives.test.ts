import { describe, expect, it } from 'vitest'
import { formatIntensity, isOverdue } from './initiatives'

describe('isOverdue', () => {
  const today = '2026-10-16'

  it('menandai inisiatif terbuka yang target tanggalnya sudah lewat', () => {
    expect(isOverdue({ status: 'planned', target_date: '2026-10-15' }, today)).toBe(true)
    expect(isOverdue({ status: 'in_progress', target_date: '2026-01-01' }, today)).toBe(true)
  })

  it('tidak menandai target hari ini, masa depan, atau tanpa target', () => {
    expect(isOverdue({ status: 'planned', target_date: today }, today)).toBe(false)
    expect(isOverdue({ status: 'planned', target_date: '2027-01-01' }, today)).toBe(false)
    expect(isOverdue({ status: 'planned', target_date: null }, today)).toBe(false)
  })

  it('tidak menandai inisiatif yang sudah selesai atau dibatalkan', () => {
    expect(isOverdue({ status: 'done', target_date: '2026-01-01' }, today)).toBe(false)
    expect(isOverdue({ status: 'cancelled', target_date: '2026-01-01' }, today)).toBe(false)
  })
})

describe('formatIntensity', () => {
  it('menampilkan emisi per orang', () => {
    expect(formatIntensity(57.75)).toBe('57.75 kg CO₂e/orang')
    expect(formatIntensity(1500)).toBe('1.50 ton CO₂e/orang')
  })

  it('menampilkan tanda strip bila jumlah anggota tim belum diisi', () => {
    expect(formatIntensity(null)).toBe('-')
    expect(formatIntensity(undefined)).toBe('-')
  })
})
