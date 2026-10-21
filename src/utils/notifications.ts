/**
 * Halaman tujuan saat notifikasi diklik: `link` dari server (mis. pengingat data untuk beberapa project
 * menuju dashboard) bila berupa path internal aplikasi, selain itu halaman project-nya.
 */
export function notificationTarget(data: { link?: string | null; project_id?: number | null }): string | null {
  // Hanya path internal: "//domain-lain", "/\domain-lain" (dianggap "//" oleh browser), atau URL penuh tidak diikuti
  if (typeof data.link === 'string' && /^\/(?![/\\])/.test(data.link)) return data.link
  return data.project_id ? `/projects/${data.project_id}` : null
}
