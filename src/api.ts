// Klien API ke Google Apps Script (apps-script/Bisnis.js).
// URL Web App diisi lewat .env: VITE_API_URL=https://script.google.com/macros/s/.../exec
// Token session disimpan oleh halaman Login di localStorage["eastville_token"].

const API_URL = import.meta.env.VITE_API_URL as string | undefined
export const TOKEN_KEY = "eastville_token"

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* abaikan */
  }
}

/**
 * Login ke backend asli untuk mendapat token. Dipanggil setelah login prototipe
 * lolos; kalau gagal, halaman tetap memakai data demo (tidak melempar error).
 */
export async function loginBackend(username: string, pin: string): Promise<boolean> {
  clearToken()
  if (!API_URL) return false
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username, pin }),
    })
    const json = await res.json()
    if (!json.success) return false
    localStorage.setItem(TOKEN_KEY, json.data.token)
    return true
  } catch {
    return false
  }
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ""
  } catch {
    return ""
  }
}

/**
 * Content-Type text/plain sengaja dipakai: Apps Script tidak mendukung preflight
 * CORS, dan text/plain termasuk "simple request" sehingga tidak memicunya.
 */
export async function api<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (!API_URL) throw new ApiError("VITE_API_URL belum diisi di file .env.")
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: getToken(), ...payload }),
  })
  const json = await res.json()
  if (!json.success) throw new ApiError(json.error ?? "Terjadi kesalahan.", json.code)
  return json.data as T
}

// ---- Tipe sesuai bentuk yang dipakai halaman (lihat Bisnis.js) ----

export interface LayananRow {
  id: number
  nama: string
  harga: number
  status: "Aktif" | "Nonaktif"
}

export interface ProdukRow {
  kode: string
  nama: string
  penjual: string
  stok: number
  skema: "Persentase" | "Nominal tetap"
  status: "Aktif" | "Nonaktif"
  harga: number
  harga_modal: number
  persen_kapster: number
  persen_penjual: number
  persen_eastville: number
  nominal_kapster: number
  nominal_penjual: number
  nominal_eastville: number
}

export interface CheckoutItem {
  tipe: "Layanan" | "Produk"
  refId: number | string
  qty: number
  kapsterId: string
}

export interface CheckoutPayload {
  metode: "Tunai" | "QRIS" | "Gabungan"
  diskon: number
  bayarTunai: number
  bayarQris: number
  items: CheckoutItem[]
}

export const apiKasir = {
  layanan: () => api<LayananRow[]>("list-layanan"),
  produk: () => api<ProdukRow[]>("list-produk"),
  kapster: () => api<{ id: string; nama: string }[]>("list-kapster"),
  checkout: (p: CheckoutPayload) =>
    api<{ id: string; total: number; kembalian: number }>("create-transaksi", { ...p }),
}

export const apiTransaksi = {
  list: (range: { dari?: string; sampai?: string } = {}) =>
    api<unknown[]>("list-transaksi", range),
  batalkan: (id: string, alasan: string) => api("batalkan-transaksi", { id, alasan }),
  pulihkan: (id: string, alasan: string) => api("pulihkan-transaksi", { id, alasan }),
}

export const apiPengeluaran = {
  list: () => api<unknown[]>("list-pengeluaran"),
  create: (p: { tanggal: string; kategori: string; deskripsi: string; jumlah: number }) =>
    api<{ id: string }>("create-pengeluaran", { ...p }),
  batalkan: (id: string, alasan: string) => api("batalkan-pengeluaran", { id, alasan }),
}

export const apiProduk = {
  list: () => api<ProdukRow[]>("list-produk"),
  simpan: (produk: Record<string, unknown>, alasan: string) =>
    api("simpan-produk", { produk, alasan }),
  adjustStok: (kode: string, delta: number, alasan: string) =>
    api("adjust-stok", { kode, delta, alasan }),
  log: () => api<unknown[]>("log-produk"),
}
