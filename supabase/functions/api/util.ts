// Helper bersama untuk semua handler. Padanan fungsi util di Kode.js / Bisnis.js.
import { createClient } from "npm:@supabase/supabase-js@2"

export const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
)

export type Role = "Owner" | "Kasir" | "Kapster"
export interface Pengguna {
  id: string
  nama: string
  username: string
  pin_hash: string
  role: Role
  cabang: string
  email: string
  status: string
}

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

export const ok = (data?: unknown, message?: string) => ({
  success: true,
  ...(message ? { message } : {}),
  ...(data !== undefined ? { data } : {}),
})

export const gagal = (error: string, code?: string) => ({
  success: false,
  error,
  ...(code ? { code } : {}),
})

// ---- Waktu: semua tanggal/jam mengikuti Asia/Jakarta, sama dengan appsscript.json ----
const WIB = "Asia/Jakarta"
function bagian(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d)
  const g = (t: string) => p.find((x) => x.type === t)!.value
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour") === "24" ? "00" : g("hour"), mi: g("minute") }
}
export const tanggalIso = (d = new Date()) => {
  const b = bagian(d)
  return `${b.y}-${b.m}-${b.d}`
}
export const jamHhmm = (d = new Date()) => {
  const b = bagian(d)
  return `${b.h}:${b.mi}`
}

// ---- PIN: format salt$sha256(salt:pin), identik dengan hashPin() di Kode.js ----
async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
export async function hashPin(pin: string, salt?: string) {
  salt = salt ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
  return `${salt}$${await sha256Hex(`${salt}:${pin}`)}`
}
export async function verifyPin(pin: string, tersimpan: string) {
  if (!tersimpan) return false
  const s = tersimpan.toString().trim()
  if (s.includes("$")) {
    const [salt, harapan] = s.split("$")
    return (await sha256Hex(`${salt}:${pin}`)) === harapan
  }
  return (await sha256Hex(pin)) === s // hash lama tanpa salt
}

/**
 * Ambil SEMUA baris sebuah query. PostgREST memotong hasil di `max_rows` (1000) tanpa pesan apa pun,
 * jadi `.limit(5000)` tetap hanya mengembalikan 1000 baris. `buat` harus memberi query BARU tiap dipanggil
 * dan wajib memakai `.order(...)` yang unik supaya halaman tidak tumpang tindih.
 */
const HALAMAN = 1000
// deno-lint-ignore no-explicit-any
export async function ambilSemua<T = Record<string, any>>(buat: () => any, maks = 100_000): Promise<T[]> {
  const hasil: T[] = []
  for (let dari = 0; dari < maks; dari += HALAMAN) {
    const { data, error } = await buat().range(dari, dari + HALAMAN - 1)
    if (error) throw new Error(error.message)
    hasil.push(...(data ?? []))
    if ((data?.length ?? 0) < HALAMAN) break
  }
  return hasil
}

/** Bagi daftar jadi potongan kecil supaya `.in(...)` tidak membuat alamat permintaan terlalu panjang. */
export function potong<T>(daftar: T[], n = 200): T[][] {
  const hasil: T[][] = []
  for (let i = 0; i < daftar.length; i += n) hasil.push(daftar.slice(i, i + n))
  return hasil
}

/** true hanya untuk tanggal kalender yang nyata ("2026-02-31" ditolak). */
export function tanggalValid(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + "T00:00:00Z")
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/**
 * Jalankan `fn` dengan kunci bernama (mutex di database, berlaku `detik` detik bila proses mati).
 * Mengembalikan null bila kunci sedang dipegang proses lain.
 */
export async function denganKunci<T>(nama: string, detik: number, fn: () => Promise<T>): Promise<{ hasil: T } | null> {
  const { data, error } = await db.rpc("kunci_ambil", { p_nama: nama, p_detik: detik })
  if (error) throw new Error(error.message)
  if (!data) return null
  try {
    return { hasil: await fn() }
  } finally {
    await db.rpc("kunci_lepas", { p_nama: nama })
  }
}

export const buatToken = () => crypto.randomUUID() + "-" + crypto.randomUUID()

export async function tulisAudit(
  userId: string, namaUser: string, aksi: string, detail = "", alasan = "",
) {
  try {
    await db.from("audit_log").insert({
      user_id: userId, nama_user: namaUser, aksi, detail, alasan,
    })
  } catch (e) {
    console.error("Audit log error:", e)
  }
}

/** Validasi token sesi dan ambil profil user. null bila tidak valid/kadaluarsa. */
export async function penggunaDariToken(token?: string): Promise<Pengguna | null> {
  if (!token) return null
  const { data: s } = await db.from("sessions").select("user_id, expire_time, status")
    .eq("token", token).maybeSingle()
  if (!s || s.status !== "Aktif" || new Date(s.expire_time) < new Date()) return null
  const { data: u } = await db.from("users").select("*").eq("id", s.user_id).maybeSingle()
  return (u as Pengguna) ?? null
}

/** Wajib login dan role termasuk daftar. Melempar ApiError bila tidak lolos. */
export async function wajibRole(token: string | undefined, role: Role[]) {
  const u = await penggunaDariToken(token)
  if (!u) throw new ApiError("Session tidak valid. Silakan login lagi.", "UNAUTHORIZED")
  if (u.status !== "Aktif") throw new ApiError("Akun tidak aktif.", "UNAUTHORIZED")
  if (!role.includes(u.role))
    throw new ApiError("Akses ditolak untuk peran " + u.role + ".", "FORBIDDEN")
  return u
}

// ---- Format tampilan (meniru Utilities.formatDate di GAS, zona Asia/Jakarta) ----
const BULAN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
function wib(d: Date) {
  const b = bagian(d)
  return { y: b.y, m: Number(b.m), d: Number(b.d), h: b.h, mi: b.mi }
}
/** "d MMM yyyy" mis. 12 Nov 2026 */
export const fmtTglPanjang = (d: Date) => { const b = wib(d); return `${b.d} ${BULAN[b.m - 1]} ${b.y}` }
/** "d MMM" */
export const fmtTglPendek = (d: Date) => { const b = wib(d); return `${b.d} ${BULAN[b.m - 1]}` }
/** "HH.mm" */
export const fmtJamTitik = (d: Date) => { const b = wib(d); return `${b.h}.${b.mi}` }
/** "d MMM HH.mm" */
export const fmtTglJam = (d: Date) => `${fmtTglPendek(d)} ${fmtJamTitik(d)}`
/** "d MMM yyyy, HH.mm" */
export const fmtTglJamPanjang = (d: Date) => `${fmtTglPanjang(d)}, ${fmtJamTitik(d)}`
/** "ddMMyy" untuk nomor invoice */
export const fmtDdMmYy = (d: Date) => { const b = bagian(d); return `${b.d}${b.m}${b.y.slice(2)}` }
/** Jam sebagai angka HHMM (1930) */
export const jamAngka = (d: Date) => { const b = bagian(d); return Number(b.h + b.mi) }
/** "HH:mm:ss" */
export function jamDetik(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: WIB, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d)
}

/**
 * Simpan foto absensi (data URL JPEG) ke Storage dan kembalikan alamat publiknya.
 * Nilai kosong atau yang sudah berupa alamat http dikembalikan apa adanya.
 */
export async function simpanFoto(fotoUrl: string, awalan: string): Promise<string> {
  if (!fotoUrl || !fotoUrl.startsWith("data:image/jpeg;base64,")) return fotoUrl
  const biner = Uint8Array.from(atob(fotoUrl.split(",")[1]), (c) => c.charCodeAt(0))
  const path = `${tanggalIso()}/${awalan}-${crypto.randomUUID().slice(0, 8)}.jpg`
  const { error } = await db.storage.from("absensi").upload(path, biner, { contentType: "image/jpeg" })
  if (error) throw new Error("Foto gagal disimpan: " + error.message)
  return db.storage.from("absensi").getPublicUrl(path).data.publicUrl
}
