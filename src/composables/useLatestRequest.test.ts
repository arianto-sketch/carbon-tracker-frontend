import { describe, expect, it } from 'vitest'
import { useLatestRequest } from './useLatestRequest'

describe('useLatestRequest', () => {
  it('hanya permintaan terakhir yang dianggap terkini', () => {
    const latest = useLatestRequest()
    const first = latest.next()
    const second = latest.next()

    expect(latest.isCurrent(first)).toBe(false)
    expect(latest.isCurrent(second)).toBe(true)
  })

  it('setiap pemakai punya urutan sendiri', () => {
    const a = useLatestRequest()
    const b = useLatestRequest()
    const ticketA = a.next()
    b.next()

    expect(a.isCurrent(ticketA)).toBe(true)
  })
})
