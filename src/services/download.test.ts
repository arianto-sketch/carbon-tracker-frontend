import { describe, expect, it } from 'vitest'
import { parseFilename, withExtensionFor } from './download'

describe('parseFilename', () => {
  it('mengembalikan null bila header tidak ada', () => {
    expect(parseFilename(undefined)).toBeNull()
    expect(parseFilename('attachment')).toBeNull()
  })

  it('membaca filename biasa dan ber-kutip', () => {
    expect(parseFilename('attachment; filename=laporan.xlsx')).toBe('laporan.xlsx')
    expect(parseFilename('attachment; filename="laporan 2026.xlsx"')).toBe('laporan 2026.xlsx')
  })

  it('mengutamakan filename* (UTF-8) daripada filename', () => {
    expect(parseFilename(`attachment; filename="Struk Cafe.pdf"; filename*=UTF-8''Struk%20Caf%C3%A9.pdf`)).toBe('Struk Café.pdf')
  })

  it('tidak membaca teks filename*= di dalam nama ber-kutip sebagai parameter', () => {
    expect(parseFilename(`attachment; filename="filename*=utf-8''evil.bat;.pdf"`)).toBe(`filename*=utf-8''evil.bat;.pdf`)
  })

  it('menangani tanda kutip yang di-escape', () => {
    expect(parseFilename('attachment; filename="Invoice \\"Maret\\".pdf"')).toBe('Invoice "Maret".pdf')
  })

  it('jatuh ke filename biasa bila filename* tidak bisa di-decode', () => {
    expect(parseFilename(`attachment; filename="cadangan.pdf"; filename*=UTF-8''%E0%A4%A.pdf`)).toBe('cadangan.pdf')
  })
})

describe('withExtensionFor', () => {
  it('mengganti ekstensi yang tidak sesuai tipe isi file', () => {
    expect(withExtensionFor('struk.bat', 'application/pdf')).toBe('struk.pdf')
    expect(withExtensionFor('foto.png', 'image/jpeg')).toBe('foto.jpg')
  })

  it('menambahkan ekstensi bila nama tidak punya ekstensi', () => {
    expect(withExtensionFor('struk', 'application/pdf')).toBe('struk.pdf')
  })

  it('mempertahankan ekstensi yang sudah sesuai, termasuk alternatifnya', () => {
    expect(withExtensionFor('foto.JPEG', 'image/jpeg')).toBe('foto.JPEG')
    expect(withExtensionFor('laporan.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('laporan.xlsx')
  })

  it('mengabaikan parameter pada Content-Type', () => {
    expect(withExtensionFor('data.txt', 'text/csv; charset=UTF-8')).toBe('data.csv')
  })

  it('membiarkan nama apa adanya untuk tipe yang tidak dikenal', () => {
    expect(withExtensionFor('arsip.zip', 'application/zip')).toBe('arsip.zip')
    expect(withExtensionFor('apa.saja', '')).toBe('apa.saja')
  })
})
