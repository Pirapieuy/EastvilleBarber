export interface PromoDiscount {
  id: string
  /** Kode unik yang diketik kasir; dibuat owner. */
  kode?: string
  nama: string
  persen: number
  berlakuSampai: string
  status: "Aktif" | "Nonaktif"
}

const STORAGE_KEY = "eastville_promos"

export const DEFAULT_PROMOS: PromoDiscount[] = [
  {
    id: "prm-1",
    kode: "JUMAT15",
    nama: "Promo Jumat Berkah",
    persen: 15,
    berlakuSampai: "2026-12-31",
    status: "Aktif",
  },
  {
    id: "prm-2",
    kode: "MEMBER10",
    nama: "Diskon Member Setia",
    persen: 10,
    berlakuSampai: "2026-12-31",
    status: "Aktif",
  },
  {
    id: "prm-3",
    kode: "ANNIV20",
    nama: "Event Anniversary Eastville",
    persen: 20,
    berlakuSampai: "2026-11-30",
    status: "Aktif",
  },
]

export function getPromoDiscounts(): PromoDiscount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROMOS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROMOS
  } catch {
    return DEFAULT_PROMOS
  }
}

export function savePromoDiscounts(promos: PromoDiscount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promos))
  } catch {
    /* abaikan */
  }
}
