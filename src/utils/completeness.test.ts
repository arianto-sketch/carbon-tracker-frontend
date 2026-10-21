import { describe, expect, it } from 'vitest'
import type { CompletenessGrid } from '@/services/completeness.service'
import { describeGap, lastMonthGap } from './completeness'

const month = (label: string, extra: Partial<CompletenessGrid['months'][number]> = {}) =>
  ({ year: 2026, month: 10, label, empty: false, dismissed: false, missing_count: 0, ...extra })

describe('lastMonthGap', () => {
  it('mengambil faktor yang belum diisi di bulan terakhir saja', () => {
    const grid: CompletenessGrid = {
      months: [month('Agustus 2026'), month('September 2026'), month('Oktober 2026')],
      factors: [
        { id: 1, name: 'Listrik PLN', statuses: ['recorded', 'missing', 'missing'] },
        { id: 2, name: 'Bensin', statuses: ['missing', 'recorded', 'recorded'] },
        { id: 3, name: 'Air galon', statuses: ['recorded', 'recorded', 'dismissed'] },
      ],
    }
    expect(lastMonthGap(grid)).toEqual({ label: 'Oktober 2026', empty: false, missing: ['Listrik PLN'] })
  })

  it('melaporkan project yang belum punya entri sama sekali', () => {
    const grid: CompletenessGrid = { months: [month('Oktober 2026', { empty: true })], factors: [] }
    expect(lastMonthGap(grid)).toEqual({ label: 'Oktober 2026', empty: true, missing: [] })
  })

  it('null bila bulan terakhir lengkap atau data belum dimuat', () => {
    const grid: CompletenessGrid = {
      months: [month('September 2026'), month('Oktober 2026')],
      factors: [{ id: 1, name: 'Listrik PLN', statuses: ['missing', 'recorded'] }],
    }
    expect(lastMonthGap(grid)).toBeNull()
    expect(lastMonthGap(null)).toBeNull()
    expect(lastMonthGap({ months: [], factors: [] })).toBeNull()
  })
})

describe('describeGap', () => {
  it('menjelaskan kekurangan data dalam satu kalimat', () => {
    expect(describeGap({ empty: true, missing: ['Listrik'] })).toBe('belum ada entri sama sekali')
    expect(describeGap({ empty: false, missing: ['Listrik PLN', 'Bensin'] })).toBe('belum ada Listrik PLN, Bensin')
  })
})
