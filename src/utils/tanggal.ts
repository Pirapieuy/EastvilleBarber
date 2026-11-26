import { useEffect, useState } from "react"

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

/** "16 - 22 Nov 2026" (atau "28 Okt - 3 Nov 2026" bila melewati bulan, "28 Des 2026 - 3 Jan 2027" bila melewati tahun). */
export function labelRentang(dari: string, sampai: string): string {
  const a = new Date(`${dari}T12:00:00`)
  const b = new Date(`${sampai}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ""
  const bln = (x: Date) =>
    new Intl.DateTimeFormat("id-ID", { month: "short" }).format(x).replace(".", "")
  const akhir = `${b.getDate()} ${bln(b)} ${b.getFullYear()}`
  if (a.getFullYear() !== b.getFullYear())
    return `${a.getDate()} ${bln(a)} ${a.getFullYear()} - ${akhir}`
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${bln(a)} - ${akhir}`
  return `${a.getDate()} - ${akhir}`
}

export type ModePeriode = "Harian" | "Mingguan" | "Bulanan"

/** Rentang yyyy-MM-dd untuk satu tanggal menurut mode: hari itu, pekan Senin-Minggu, atau satu bulan penuh. */
export function rentangPeriode(mode: ModePeriode, tanggal: string) {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const d = new Date(`${tanggal}T12:00:00`)
  if (mode === "Harian") return { dari: tanggal, sampai: tanggal }
  if (mode === "Mingguan") {
    const senin = new Date(d)
    senin.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const minggu = new Date(senin)
    minggu.setDate(senin.getDate() + 6)
    return { dari: iso(senin), sampai: iso(minggu) }
  }
  return {
    dari: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
    sampai: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  }
}

/** Teks tombol tanggal menurut mode: undefined (pakai format harian biasa), rentang pekan, atau nama bulan. */
export function labelPeriode(mode: ModePeriode, tanggal: string): string | undefined {
  if (!tanggal || mode === "Harian") return undefined
  const r = rentangPeriode(mode, tanggal)
  if (mode === "Mingguan") return labelRentang(r.dari, r.sampai)
  return new Date(`${tanggal}T12:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })
}

const KUNCI_PERIODE = "eastville_periode_"

export interface PeriodeTersimpan {
  mode: ModePeriode
  tanggal: string
}

/** Hapus semua periode tersimpan (dipakai saat logout). */
export function hapusPeriodeTersimpan() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(KUNCI_PERIODE)) sessionStorage.removeItem(k)
    }
  } catch {
    /* tanpa penyimpanan sesi, periode kembali ke hari ini */
  }
}

function bacaPeriode(halaman: string): PeriodeTersimpan | null {
  try {
    const raw = sessionStorage.getItem(KUNCI_PERIODE + halaman)
    if (!raw) return null
    const p = JSON.parse(raw) as { mode?: string; tanggal?: string; hari?: string }
    // Pindah hari: kembali ke hari ini.
    if (p.hari !== TANGGAL_MAKS()) return null
    if (p.mode !== "Harian" && p.mode !== "Mingguan" && p.mode !== "Bulanan") return null
    if (typeof p.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal)) return null
    if (p.tanggal < TANGGAL_MULAI || p.tanggal > TANGGAL_MAKS()) return null
    return { mode: p.mode, tanggal: p.tanggal }
  } catch {
    return null
  }
}

/**
 * Mode dan tanggal pemilih periode satu halaman: awal Harian hari ini, bertahan saat refresh
 * (sessionStorage per halaman), kembali ke hari ini saat hari berganti atau logout.
 * `awal` (mis. filter kiriman Laporan Keuangan) didahulukan dari yang tersimpan.
 */
export function usePeriodeTersimpan(halaman: string, awal?: Partial<PeriodeTersimpan>) {
  const [periode, setPeriode] = useState<PeriodeTersimpan>(() => {
    if (awal?.tanggal) return { mode: awal.mode ?? "Harian", tanggal: awal.tanggal }
    return bacaPeriode(halaman) ?? { mode: "Harian", tanggal: TANGGAL_MAKS() }
  })
  // Halaman dibiarkan terbuka melewati tengah malam: kembali ke Harian hari ini tanpa muat ulang.
  useEffect(() => {
    let hari = TANGGAL_MAKS()
    const cekHari = () => {
      const sekarang = TANGGAL_MAKS()
      if (sekarang === hari) return
      hari = sekarang
      setPeriode({ mode: "Harian", tanggal: sekarang })
    }
    const timer = window.setInterval(cekHari, 30_000)
    document.addEventListener("visibilitychange", cekHari)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", cekHari)
    }
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(
        KUNCI_PERIODE + halaman,
        JSON.stringify({ ...periode, hari: TANGGAL_MAKS() }),
      )
    } catch {
      /* tanpa penyimpanan sesi, periode tidak bertahan saat refresh */
    }
  }, [halaman, periode])
  return [
    periode,
    (mode: ModePeriode) => setPeriode((p) => ({ ...p, mode })),
    (tanggal: string) => setPeriode((p) => ({ ...p, tanggal })),
  ] as const
}

/** Satu tanggal (tanpa mode) dengan perilaku sama: awal hari ini, bertahan saat refresh. */
export function useTanggalTersimpan(halaman: string) {
  const [periode, , setTanggal] = usePeriodeTersimpan(halaman)
  return [periode.tanggal, setTanggal] as const
}
