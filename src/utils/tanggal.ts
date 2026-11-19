/** Data tercatat sejak aplikasi dipakai; pemilih tanggal tidak boleh sebelum ini. */
export const TANGGAL_MULAI = "2026-10-01"

const pad = (n: number) => String(n).padStart(2, "0")

const tanggalDate = (value: string | Date) => {
  if (value instanceof Date) return value
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00`)
  return new Date(raw)
}

/** Format baku tampilan tanggal aplikasi: "11 Nov 2026". */
export function formatTanggal(value: string | Date): string {
  const date = tanggalDate(value)
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : ""
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

/** Format baku tanggal dan waktu aplikasi: "11 Nov 2026, 10:30". */
export function formatTanggalWaktu(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()))
    return formatTanggal(value)
  const date = tanggalDate(value)
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : ""
  const tgl = formatTanggal(date)
  const jam = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(".", ":")
  return `${tgl}, ${jam}`
}

/** Hari ini (yyyy-MM-dd, zona perangkat); pemilih tanggal tidak boleh melewati ini (tidak ada data hari esok). */
export const TANGGAL_MAKS = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const tanggalIsoLokal = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
