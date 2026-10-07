import api from './api'

/**
 * Nama file dari header Content-Disposition (RFC 6266): filename* (UTF-8, RFC 5987) diutamakan, lalu filename.
 * Header dibaca per parameter dan quoted-string tidak dipecah, jadi teks seperti `filename*=` di dalam
 * nama ber-kutip tidak terbaca sebagai parameter.
 */
export function parseFilename(disposition?: string): string | null {
  if (!disposition) return null

  const params = new Map<string, string>()
  for (const [, key, raw] of disposition.matchAll(/;\s*([^\s=;]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/g)) {
    const name = key.toLowerCase()
    if (params.has(name)) continue
    const value = raw.trim()
    const quoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"')
    params.set(name, quoted ? value.slice(1, -1).replace(/\\(.)/g, '$1') : value)
  }

  const extended = /^utf-8'[^']*'(.+)$/i.exec(params.get('filename*') ?? '')
  if (extended) {
    try { return decodeURIComponent(extended[1]) } catch { /* encoding rusak, coba filename biasa */ }
  }
  return params.get('filename') || null
}

/** Ekstensi yang sah per tipe isi file dari server; ekstensi pertama dipakai bila nama tidak cocok. */
const EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/csv': ['csv'],
}

/**
 * Samakan ekstensi nama file dengan tipe isi yang dikirim server, supaya nama dari pengunggah
 * (mis. PDF bernama "struk.bat") tidak menentukan bagaimana file dibuka di komputer pengunduh.
 */
export function withExtensionFor(filename: string, mimeType: string): string {
  const allowed = EXTENSIONS_BY_TYPE[mimeType.split(';')[0].trim().toLowerCase()]
  if (!allowed) return filename

  const dot = filename.lastIndexOf('.')
  if (dot > 0 && allowed.includes(filename.slice(dot + 1).toLowerCase())) return filename

  const base = dot > 0 ? filename.slice(0, dot) : filename
  return `${base || 'unduhan'}.${allowed[0]}`
}

// Unduh file lewat axios (membawa Bearer token). Nama file dari Content-Disposition, lalu fallbackName;
// ekstensinya selalu mengikuti tipe isi file.
export async function fetchFile(url: string, fallbackName: string) {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blob = response.data as Blob
    const filename = withExtensionFor(parseFilename(response.headers['content-disposition']) ?? fallbackName, blob.type)
    return { blob, filename }
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
