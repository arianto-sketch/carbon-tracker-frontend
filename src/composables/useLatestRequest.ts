/**
 * Menandai permintaan yang dikirim berurutan (mis. pencarian yang diketik cepat) supaya hanya
 * respons dari permintaan terakhir yang dipakai; respons lama yang datang terlambat diabaikan.
 *
 *   const latest = useLatestRequest()
 *   const ticket = latest.next()
 *   const res = await api...
 *   if (!latest.isCurrent(ticket)) return
 */
export function useLatestRequest() {
  let current = 0

  return {
    next: () => ++current,
    isCurrent: (ticket: number) => ticket === current,
  }
}
