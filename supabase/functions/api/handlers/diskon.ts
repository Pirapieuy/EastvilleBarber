// Padanan KODE DISKON dan PIN otorisasi di Bisnis.js.
import { db, gagal, ok, tanggalIso, tanggalValid, tulisAudit, verifyPin, type Pengguna } from "../util.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const toInt = (v: unknown) => { const n = Math.round(Number(v)); return isNaN(n) ? 0 : n }
export const normalKode = (k: unknown) => String(k ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")

export async function listKodeDiskon() {
  const { data } = await db.from("kode_diskon").select("id,kode,nama,persen,berlaku_sampai,status,dibuat_oleh,waktu,dipakai,jenis,nilai").order("urut", { ascending: false })
  return ok(data ?? [])
}

/** Validasi kode untuk checkout. Mengembalikan {kode, diskon} atau {error}. */
export async function cekKodeDiskon(kodeInput: string, subtotal: number, tanggalAcuan?: string) {
  const kode = normalKode(kodeInput)
  if (!kode) return { error: "Kode diskon kosong." }
  const hariIni = tanggalAcuan || tanggalIso()
  const { data: semua } = await db.from("kode_diskon").select("*")
  const k = (semua ?? []).find((r) => normalKode(r.kode) === kode)
  if (!k) return { error: "Kode diskon tidak ditemukan." }
  if (k.status !== "Aktif") return { error: "Kode diskon tidak aktif." }
  if (k.berlaku_sampai && k.berlaku_sampai < hariIni) return { error: "Kode diskon sudah kedaluwarsa." }
  const jenis = k.jenis === "nominal" ? "nominal" : "persen"
  const nilai = Number(k.nilai) || Number(k.persen) || 0
  if (nilai <= 0 || (jenis === "persen" && nilai > 100)) return { error: "Kode diskon tidak valid." }
  return { kode, diskon: Math.min(subtotal, jenis === "nominal" ? nilai : Math.round((subtotal * nilai) / 100)) }
}

export async function cekKodeKasir(body: B) {
  const kode = normalKode(body.kode)
  const cek = await cekKodeDiskon(kode, 1000000)
  if ("error" in cek) return gagal(cek.error!)
  const { data: semua } = await db.from("kode_diskon").select("*")
  const r = (semua ?? []).find((x) => normalKode(x.kode) === kode)!
  return ok({
    kode, nama: String(r.nama), persen: Number(r.persen) || 0,
    jenis: r.jenis === "nominal" ? "nominal" : "persen", nilai: Number(r.nilai) || Number(r.persen) || 0,
  })
}

export async function catatPemakaianKode(kode: string) {
  if (!kode) return
  const { data: semua } = await db.from("kode_diskon").select("id,kode,dipakai")
  const r = (semua ?? []).find((x) => normalKode(x.kode) === kode)
  if (r) await db.from("kode_diskon").update({ dipakai: (Number(r.dipakai) || 0) + 1 }).eq("id", r.id)
}

export async function simpanKodeDiskon(body: B, user: Pengguna) {
  const d = body.kodeDiskon || {}
  const kode = normalKode(d.kode)
  const nama = String(d.nama ?? "").trim()
  const jenis = d.jenis === "nominal" ? "nominal" : "persen"
  const nilaiMentah = Number(d.nilai === undefined ? d.persen : d.nilai)
  if (!Number.isInteger(nilaiMentah)) return gagal("Nilai diskon harus angka bulat.")
  const nilai = nilaiMentah
  const persen = jenis === "persen" ? nilai : 0
  const sampai = String(d.berlakuSampai ?? "").trim()
  const status = d.status === "Nonaktif" ? "Nonaktif" : "Aktif"
  if (kode.length < 4 || kode.length > 20) return gagal("Kode harus 4-20 huruf atau angka.")
  if (!nama) return gagal("Nama promo wajib diisi.")
  if (nilai < 1 || (jenis === "persen" && nilai > 100))
    return gagal(jenis === "persen" ? "Persen diskon harus 1-100." : "Nominal diskon minimal Rp1.")
  if (!tanggalValid(sampai)) return gagal("Tanggal berlaku sampai tidak valid.")
  if (jenis === "nominal" && nilai > 100_000_000) return gagal("Nominal diskon terlalu besar.")

  const { data: semua } = await db.from("kode_diskon").select("id,kode")
  if ((semua ?? []).some((r) => normalKode(r.kode) === kode && String(r.id) !== String(d.id)))
    return gagal("Kode itu sudah dipakai promo lain.")
  const label = jenis === "persen" ? nilai + "%" : "Rp" + nilai

  if (d.id) {
    if (!(semua ?? []).some((r) => String(r.id) === String(d.id))) return gagal("Kode diskon tidak ditemukan.")
    await db.from("kode_diskon").update({ kode, nama, persen, jenis, nilai, berlaku_sampai: sampai, status }).eq("id", d.id)
    await tulisAudit(user.id, user.nama, "UBAH_KODE_DISKON", `${kode} ${label} ${status}`)
    return ok({ id: d.id })
  }
  const id = "kd-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  await db.from("kode_diskon").insert({
    id, kode, nama, persen, jenis, nilai, berlaku_sampai: sampai, status, dibuat_oleh: user.nama, dipakai: 0,
  })
  await tulisAudit(user.id, user.nama, "BUAT_KODE_DISKON", `${kode} ${label}`)
  return ok({ id })
}

export async function hapusKodeDiskon(body: B, user: Pengguna) {
  const { data: r } = await db.from("kode_diskon").select("id,kode").eq("id", body.id).maybeSingle()
  if (!r) return gagal("Kode diskon tidak ditemukan.")
  await db.from("kode_diskon").delete().eq("id", r.id)
  await tulisAudit(user.id, user.nama, "HAPUS_KODE_DISKON", String(r.kode))
  return ok({ id: r.id })
}

/** True bila PIN cocok dengan salah satu akun Owner aktif. */
async function pinAtasanValid(pin: string) {
  if (!pin) return false
  const { data } = await db.from("users").select("pin_hash").eq("role", "Owner").eq("status", "Aktif")
  for (const r of data ?? []) if (await verifyPin(pin, r.pin_hash)) return true
  return false
}

/** Batas 5x salah per 5 menit per user. Mengembalikan pesan error, atau "" bila PIN sah. */
export async function cekPinOtorisasi(user: Pengguna, pin: unknown) {
  const kunci = "pinotor_" + user.id
  const { data: c } = await db.from("login_gagal").select("*").eq("username", kunci).maybeSingle()
  const segar = c && Date.now() - new Date(c.terakhir).getTime() < 300_000
  const gagalSebelumnya = segar ? c!.jumlah : 0
  if (gagalSebelumnya >= 5) return "Terlalu banyak PIN salah. Coba lagi dalam 5 menit."
  if (!(await pinAtasanValid(String(pin ?? "")))) {
    await db.from("login_gagal").upsert({ username: kunci, jumlah: gagalSebelumnya + 1, terakhir: new Date().toISOString() })
    return "PIN Owner salah atau belum diisi. Diskon tidak diizinkan."
  }
  await db.from("login_gagal").delete().eq("username", kunci)
  return ""
}

export async function verifikasiPinOtorisasi(body: B, user: Pengguna) {
  if (user.role !== "Kasir") return gagal("Verifikasi PIN otorisasi hanya untuk Kasir.")
  const salah = await cekPinOtorisasi(user, body.pin)
  return salah ? gagal(salah) : ok({ valid: true })
}
