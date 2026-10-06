import api from './api'

export function parseFilename(disposition?: string): string | null {
  if (!disposition) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition)
  if (encoded) {
    try { return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, '')) } catch { /* abaikan, coba filename biasa */ }
  }
  const plain = /filename\s*=\s*("([^"]+)"|[^;]+)/.exec(disposition)
  if (plain) return (plain[2] ?? plain[1]).trim()
  return null
}

// Unduh file lewat axios (membawa Bearer token). Nama file dari Content-Disposition, lalu fallbackName.
export async function fetchFile(url: string, fallbackName: string) {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const filename = parseFilename(response.headers['content-disposition']) ?? fallbackName
    return { blob: response.data as Blob, filename }
  } catch (err: any) {
    // Dengan responseType 'blob', body error JSON juga berupa Blob — ubah ke objek agar pesannya terbaca.
    const body = err?.response?.data
    if (body instanceof Blob) {
      try { err.response.data = JSON.parse(await body.text()) } catch { /* bukan JSON */ }
    }
    throw err
  }
}

/** Picu dialog simpan file di browser. */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
