/** Data tercatat sejak aplikasi dipakai; pemilih tanggal tidak boleh sebelum ini. */
export const TANGGAL_MULAI = "2026-10-01"

const pad = (n: number) => String(n).padStart(2, "0")

/** Hari ini (yyyy-MM-dd, zona perangkat); pemilih tanggal tidak boleh melewati ini (tidak ada data hari esok). */
export const TANGGAL_MAKS = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
