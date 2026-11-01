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

export interface LoginUser {
  id: string
  name: string
  username: string
  role: "Owner" | "Manajer" | "Kasir" | "Kapster"
}

/** Login ke backend; menyimpan token dan mengembalikan data user. Melempar ApiError bila gagal. */
export async function loginBackend(username: string, pin: string): Promise<LoginUser> {
  clearToken()
  if (!API_URL) throw new ApiError("VITE_API_URL belum diisi di file .env.")
  let json
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", username, pin }),
    })
    json = await res.json()
  } catch {
    throw new ApiError("Gagal terhubung ke server. Coba lagi.")
  }
  if (!json.success) throw new ApiError(json.error ?? "Login gagal.")
  localStorage.setItem(TOKEN_KEY, json.data.token)
  return json.data.user as LoginUser
}

/** Cek token tersimpan ke server. Mengembalikan user bila sesi masih berlaku, atau null. */
export async function restoreSession(): Promise<LoginUser | null> {
  const token = getToken()
  if (!token || !API_URL) return null
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "verify-session", token }),
    })
    const json = await res.json()
    if (!json.success) {
      clearToken()
      return null
    }
    return json.data.user as LoginUser
  } catch {
    // Server tidak terjangkau: token dibiarkan, tapi user diminta login lagi.
    return null
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

export const apiLayanan = {
  list: () => api<LayananRow[]>("list-layanan"),
  simpan: (layanan: { id?: number; nama: string; harga: number; status: "Aktif" | "Nonaktif" }) =>
    api<{ id: number }>("simpan-layanan", { layanan }),
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
  /** Rekap manual: transaksi susulan dari buku. Nomor nota = nomor buku. */
  manual: (p: CheckoutPayload & { tanggal: string; nomorNota: string; jam?: string }) =>
    api<{ id: string; total: number }>("create-transaksi-manual", { ...p }),
  batalkan: (id: string, alasan: string) => api("batalkan-transaksi", { id, alasan }),
  pulihkan: (id: string, alasan: string) => api("pulihkan-transaksi", { id, alasan }),
}

export const apiPengeluaran = {
  list: () => api<unknown[]>("list-pengeluaran"),
  create: (p: { tanggal: string; kategori: string; deskripsi: string; jumlah: number }) =>
    api<{ id: string }>("create-pengeluaran", { ...p }),
  batalkan: (id: string, alasan: string) => api("batalkan-pengeluaran", { id, alasan }),
  aktifkan: (id: string) => api("aktifkan-pengeluaran", { id }),
}

export const apiProduk = {
  list: () => api<ProdukRow[]>("list-produk"),
  simpan: (produk: Record<string, unknown>, alasan: string) =>
    api("simpan-produk", { produk, alasan }),
  adjustStok: (kode: string, delta: number, alasan: string) =>
    api("adjust-stok", { kode, delta, alasan }),
  log: () => api<unknown[]>("log-produk"),
}

export interface PengaturanKomisi {
  jamMulai: string
  jamSelesai: string
  komisiDefault: number
  komisiLembur: number
  kapster: { id: string; nama: string; persen: number | null }[]
}

export const apiPengaturan = {
  get: () => api<PengaturanKomisi>("get-pengaturan"),
  simpan: (p: {
    jamMulai: string
    jamSelesai: string
    komisiDefault: number
    komisiLembur: number
    alasan: string
  }) => api<PengaturanKomisi>("simpan-pengaturan", { ...p }),
  setKomisiKapster: (userId: string, persen: number | null, alasan: string) =>
    api<PengaturanKomisi>("set-komisi-kapster", { userId, persen, alasan }),
}

export interface KomisiKapsterRow {
  kapsterId: string
  kapster: string
  jumlahTransaksi: number
  komisiLayanan: number
  komisiLembur: number
  komisiProduk: number
  totalKomisi: number
  penjualanLayanan: number
  penjualanProduk: number
}

export const apiKomisi = {
  /** Komisi per kapster untuk satu periode (yyyy-MM-dd). Kapster hanya mendapat dirinya sendiri. */
  list: (range: { dari?: string; sampai?: string; kapsterId?: string } = {}) =>
    api<KomisiKapsterRow[]>("list-komisi", range),
}
