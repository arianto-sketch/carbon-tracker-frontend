import { describe, expect, it } from 'vitest'
import { notificationTarget } from './notifications'

describe('notificationTarget', () => {
  it('memakai link internal dari server bila ada', () => {
    expect(notificationTarget({ link: '/', project_id: null })).toBe('/')
    expect(notificationTarget({ link: '/projects/7', project_id: 7 })).toBe('/projects/7')
  })

  it('kembali ke halaman project untuk notifikasi lama tanpa link', () => {
    expect(notificationTarget({ project_id: 12 })).toBe('/projects/12')
  })

  it('tidak mengikuti link ke luar aplikasi', () => {
    expect(notificationTarget({ link: '//contoh.test/x', project_id: 3 })).toBe('/projects/3')
    expect(notificationTarget({ link: 'https://contoh.test', project_id: null })).toBeNull()
  })

  it('null bila tidak ada tujuan', () => {
    expect(notificationTarget({})).toBeNull()
  })
})
