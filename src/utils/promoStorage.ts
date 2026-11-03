export interface PromoDiscount {
  id: string
  nama: string
  persen: number
  berlakuSampai: string
  status: "Aktif" | "Nonaktif"
}

const STORAGE_KEY = "eastville_promos"

export const DEFAULT_PROMOS: PromoDiscount[] = [
  {
    id: "prm-1",
    nama: "Promo Jumat Berkah",
    persen: 15,
    berlakuSampai: "2026-12-31",
    status: "Aktif",
  },
  {
    id: "prm-2",
    nama: "Diskon Member Setia",
    persen: 10,
    berlakuSampai: "2026-12-31",
    status: "Aktif",
  },
  {
    id: "prm-3",
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
