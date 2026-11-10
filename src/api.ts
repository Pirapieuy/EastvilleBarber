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
export async function loginBackend(
  username: string,
  pin: string,
): Promise<LoginUser> {
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
  if (!json.success)
    throw new ApiError(json.error ?? "Terjadi kesalahan.", json.code)
  return json.data as T
}

// ---- Tipe sesuai bentuk yang dipakai halaman (lihat Bisnis.js) ----

export interface LayananRow {
  id: number
  nama: string
  harga: number
  status: "Aktif" | "Nonaktif"
  /** Potong | Grooming | Coloring | Perawatan; kosong untuk layanan lama tanpa kategori */
  kategori?: string
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
  /** Transaksi gratis (promo/traktiran): total Rp0 hanya diterima server bila true + alasan */
  gratis?: boolean
  alasan?: string
  /** PIN Owner/Manajer untuk menyetujui diskon (diverifikasi server) */
  pinOtorisasi?: string
  /** Id unik per percobaan bayar: server tidak membuat nota ganda bila dikirim ulang */
  clientRequestId?: string
}

export const apiLayanan = {
  list: () => api<LayananRow[]>("list-layanan"),
  simpan: (layanan: {
    id?: number
    nama: string
    harga: number
    status: "Aktif" | "Nonaktif"
    kategori: string
  }) => api<{ id: number }>("simpan-layanan", { layanan }),
}

export const apiKasir = {
  layanan: () => api<LayananRow[]>("list-layanan"),
  produk: () => api<ProdukRow[]>("list-produk"),
  kapster: () => api<{ id: string; nama: string }[]>("list-kapster"),
  checkout: (p: CheckoutPayload) =>
    api<{ id: string; total: number; kembalian: number }>("create-transaksi", {
      ...p,
    }),
  /** Cek PIN Owner/Manajer lebih awal (khusus Kasir; 5x salah = tunggu 5 menit). Gagal -> melempar Error. */
  verifikasiPin: (pin: string) =>
    api<{ valid: boolean }>("verifikasi-pin-otorisasi", { pin }),
}

export interface RekapShift {
  tanggal: string
  /** jam mulai cakupan shift (HH.mm) */
  dariJam: string
  jumlahTrx: number
  penjualan: number
  diskon: number
  /** tunai yang seharusnya ada di laci (total - QRIS, kembalian sudah terpotong) */
  tunaiSistem: number
  qrisSistem: number
  gratis: number
}

export interface TutupKasirRow {
  id: string
  tanggal: string
  dariJam: string
  sampaiJam: string
  waktu: number
  kasir: string
  jumlahTrx: number
  penjualan: number
  diskon: number
  tunaiSistem: number
  qrisSistem: number
  uangFisik: number
  selisih: number
  catatan: string
}

export const apiTutupKasir = {
  /** Ringkasan sistem shift berjalan (Kasir). */
  rekap: () => api<RekapShift>("rekap-kasir"),
  tutup: (uangFisik: number, catatan: string) =>
    api<{ id: string; selisih: number; tunaiSistem: number; uangFisik: number }>(
      "tutup-kasir",
      { uangFisik, catatan },
    ),
  /** Kasir: miliknya sendiri; Owner/Manajer: semua kasir. */
  list: (range: { dari?: string; sampai?: string } = {}) =>
    api<TutupKasirRow[]>("list-tutup-kasir", range),
}

export const apiTransaksi = {
  list: (range: { dari?: string; sampai?: string } = {}) =>
    api<unknown[]>("list-transaksi", range),
  /** Rekap manual: transaksi susulan dari buku. Nomor nota = nomor buku. */
  manual: (
    p: CheckoutPayload & { tanggal: string; nomorNota: string; jam?: string },
  ) =>
    api<{ id: string; total: number; lembur?: boolean }>(
      "create-transaksi-manual",
      { ...p },
    ),
  batalkan: (id: string, alasan: string) =>
    api("batalkan-transaksi", { id, alasan }),
  pulihkan: (id: string, alasan: string) =>
    api("pulihkan-transaksi", { id, alasan }),
}

export const apiPengeluaran = {
  list: () => api<unknown[]>("list-pengeluaran"),
  create: (p: {
    tanggal: string
    kategori: string
    deskripsi: string
    jumlah: number
  }) => api<{ id: string }>("create-pengeluaran", { ...p }),
  batalkan: (id: string, alasan: string) =>
    api("batalkan-pengeluaran", { id, alasan }),
  aktifkan: (id: string) => api("aktifkan-pengeluaran", { id }),
}

export const apiProduk = {
  list: () => api<ProdukRow[]>("list-produk"),
  /** baru=true: tolak bila kode produk sudah dipakai (tanpa ini, kode yang ada dianggap edit). */
  simpan: (produk: Record<string, unknown>, alasan: string, baru = false) =>
    api("simpan-produk", { produk, alasan, baru }),
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

export interface AktivitasKapster {
  item: string
  qty: number
  type: "Layanan" | "Produk"
  /** HH.mm */
  time: string
  fee: number
  comm: number
  /** id invoice */
  trx: string
  /** transaksi di luar jam kerja (komisi lembur) */
  lembur?: boolean
}

export const apiKapster = {
  /** Layanan & produk yang dikerjakan kapster yang login pada satu hari (default hari ini). */
  aktivitas: (tanggal?: string) =>
    api<AktivitasKapster[]>("aktivitas-kapster", { tanggal }),
}

export interface LaporanKeuangan {
  pemasukan: number
  tunai: number
  qris: number
  pengeluaran: number
  komisi: number
  /** pemasukan - pengeluaran - komisi kapster */
  sisa: number
  jumlahTransaksi: number
  perHari: { tanggal: string; total: number; tunai: number; qris: number }[]
  perKapster: {
    kapsterId: string
    kapster: string
    pelanggan: number
    omzet: number
    komisi: number
  }[]
  stokMenipis: { kode: string; nama: string; stok: number }[]
}

export const apiLaporan = {
  /** Ringkasan versi Tim B (ringkasan-laporan, Kode.js) */
  ringkasan: (filter: { dari?: string; sampai?: string } = {}) =>
    api<RingkasanLaporan>("ringkasan-laporan", filter),
  keuangan: (range: { dari?: string; sampai?: string } = {}) =>
    api<LaporanKeuangan>("laporan-keuangan", range),
  produk: (range: { dari?: string; sampai?: string } = {}) =>
    api<unknown[]>("laporan-produk", range),
}

export const apiBackup = {
  list: () =>
    api<{ nama: string; dibuat: string; sheet: number; baris: number }[]>(
      "backup-list",
    ),
  buat: () => api<{ nama: string }>("backup-buat"),
  /** Mengganti isi sheet bisnis dengan isi backup; server membuat backup pengaman dulu. */
  pulihkan: (nama: string) =>
    api<{ nama: string; sheet: number; pengaman: string }>("backup-pulihkan", {
      nama,
    }),
  hapus: (nama: string) => api<{ nama: string }>("backup-hapus", { nama }),
  unduh: (nama: string) =>
    api<{
      nama: string
      sheets: Record<string, (string | number | boolean)[][]>
    }>("backup-unduh", { nama }),
}

// ============================================================
// TIM B: API CLIENT (Manajemen Tim, Layanan, Gaji & Kasbon, Laporan, Absensi)
// ============================================================

export const apiAuth = {
  forgotPin: (email: string) =>
    api<{ resetToken: string; email: string }>("forgot-pin", { email }),
  resetPin: (email: string, resetToken: string, newPin: string) =>
    api<{ success: boolean; message: string }>("reset-pin", {
      email,
      resetToken,
      newPin,
    }),
  logout: () => api<{ success: boolean; message: string }>("logout"),
}

export interface UserRow {
  id: string
  nama: string
  username: string
  role: "Owner" | "Manajer" | "Kasir" | "Kapster"
  cabang: string
  email: string
  status: "Aktif" | "Nonaktif"
  dibuat: string
}

export const apiTim = {
  list: () => api<UserRow[]>("list-users"),
  create: (p: {
    nama: string
    username: string
    pin: string
    role: string
    cabang?: string
    email: string
  }) => api<UserRow>("create-user", { ...p }),
  update: (p: {
    id: string
    nama: string
    username: string
    role: string
    cabang?: string
    email: string
    newPin?: string
  }) => api<{ success: boolean }>("update-user", { ...p }),
  toggleStatus: (id: string, status: "Aktif" | "Nonaktif") =>
    api<{ success: boolean }>("toggle-user-status", { id, status }),
}

/** CRUD layanan versi Fitra. Halaman Layanan & Harga memakai apiLayanan (simpan-layanan, Bisnis.js). */
export const apiLayananFitra = {
  list: () => api<LayananRow[]>("list-layanan"),
  create: (nama: string, harga: number) =>
    api<LayananRow>("create-layanan", { nama, harga }),
  update: (
    id: number,
    nama: string,
    harga: number,
    status: "Aktif" | "Nonaktif",
  ) => api<{ success: boolean }>("update-layanan", { id, nama, harga, status }),
  toggleStatus: (id: number, status: "Aktif" | "Nonaktif") =>
    api<{ success: boolean }>("toggle-layanan", { id, status }),
}

export interface KasbonRow {
  id: string
  tanggal: string
  userId: string
  nama: string
  role: string
  jumlah: number
  status: "Aktif" | "Lunas"
  catatan: string
  dibuatOleh: string
  lunasWaktu?: string
}

export interface GajiRow {
  id: string
  periode: string
  userId: string
  nama: string
  role: string
  totalKomisi: number
  totalKasbon: number
  gajiBersih: number
  status: "Dibayar" | "Draft"
  tanggalBayar: string
  dibayarOleh: string
  catatan: string
}

export interface HitungGajiResult {
  userId: string
  totalKomisi: number
  totalKasbon: number
  gajiBersih: number
  transaksiSelesai: number
  kasbonAktif: { id: string; tanggal: string; jumlah: number; catatan: string }[]
}

export const apiKasbon = {
  list: () => api<KasbonRow[]>("list-kasbon"),
  create: (p: {
    userId?: string
    nama?: string
    role?: string
    jumlah: number
    catatan?: string
    tanggal?: string
  }) => api<KasbonRow>("create-kasbon", { ...p }),
  lunasi: (id: string) => api<{ success: boolean }>("lunasi-kasbon", { id }),
}

export const apiGaji = {
  hitung: (userId?: string) => api<HitungGajiResult>("hitung-gaji", { userId }),
  bayar: (p: {
    userId: string
    nama: string
    role: string
    periode?: string
    totalKomisi: number
    totalKasbon: number
    gajiBersih?: number
    catatan?: string
  }) =>
    api<{ id: string; gajiBersih: number; status: string }>("bayar-gaji", {
      ...p,
    }),
  list: () => api<GajiRow[]>("list-gaji"),
}

export interface RingkasanLaporan {
  totalOmset: number
  totalDiskon: number
  totalBayarTunai: number
  totalBayarQris: number
  totalKomisi: number
  totalPengeluaran: number
  sisaOwner: number
  jumlahTransaksi: number
  pengeluaranKategori: Record<string, number>
  harian: {
    tanggal: string
    omset: number
    tunai: number
    qris: number
    count: number
  }[]
}

export interface AbsensiRow {
  id: string
  waktu: string
  tanggal: string
  jam: string
  userId: string
  nama: string
  role: string
  tipe: "Masuk" | "Pulang" | ""
  fotoUrl?: string
  status: string
  catatan?: string
}

export const apiAbsensi = {
  catat: (p: { tipe: "Masuk" | "Pulang"; fotoUrl?: string; catatan?: string }) =>
    api<AbsensiRow>("catat-absensi", { ...p }),
  list: (filter: { tanggal?: string; userId?: string } = {}) =>
    api<AbsensiRow[]>("list-absensi", filter),
  koreksi: (p: { id: string; status: string; catatan?: string }) =>
    api<{ id: string; status: string; koreksiOleh: string }>(
      "koreksi-absensi",
      p,
    ),
}

/** Aksi absensi Kapster dari sisi Kasir. */
export const apiAbsensiKapster = {
  /** Catat absensi Kapster. */
  catatAbsensiKapster: (p: {
    targetUserId: string
    tanggal: string
    status: string
    fotoUrl: string
    catatan?: string
  }) =>
    api<{
      id: string
      tanggal: string
      jam: string
      userId: string
      nama: string
      status: string
      fotoUrl: string
      catatan: string
    }>("catat-absensi-kapster", p),
}

export interface AuditLogRow {
  waktu: string
  tanggal: string
  jam?: string
  userId: string
  namaUser?: string
  pengguna?: string
  aksi: string
  detail: string
  alasan: string
}

export const apiAudit = {
  list: (filter: { tanggal?: string; aksi?: string; user?: string } = {}) =>
    api<AuditLogRow[]>("list-audit", filter),
}
