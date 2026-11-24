// Padanan simpanProduk_, hapusProduk_, adjustStok_, mutasiStok_ di Bisnis.js.
import { db, gagal, ok, tulisAudit, type Pengguna } from "../util.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const toInt = (v: unknown) => {
  const n = Math.round(Number(v))
  return isNaN(n) ? 0 : n
}
/** Bilangan bulat dari input; null bila bukan angka bulat ("abc", 1.5, kosong). */
const bulat = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}
const BATAS_RUPIAH = 1_000_000_000
const oleh = (u: Pengguna) => `${u.nama} · ${u.role}`

/** Stok atomik lewat fungsi SQL mutasi_stok. Mengembalikan stok akhir (null = produk tak ada). */
export async function mutasiStok(kode: string, delta: number, alasan: string, trxId: string, user: Pengguna) {
  const { data, error } = await db.rpc("mutasi_stok", {
    p_kode: kode, p_delta: delta, p_alasan: alasan, p_trx: trxId, p_oleh: oleh(user),
  })
  if (error) throw new Error(error.message)
  return data as number | null
}

export async function simpanProduk(body: B, user: Pengguna) {
  const p = body.produk || {}
  const alasan = String(body.alasan ?? "").trim()
  p.kode = String(p.kode ?? "").trim(); p.nama = String(p.nama ?? "").trim()
  if (!p.kode || !p.nama) return gagal("Kode dan nama produk wajib diisi.")
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(p.kode)) return gagal("Kode produk hanya boleh huruf, angka, titik, minus, garis bawah (maks 30).")
  const harga = bulat(p.harga), modal = bulat(p.hargaModal ?? 0)
  if (harga === null || harga <= 0 || harga > BATAS_RUPIAH) return gagal("Harga jual harus angka bulat lebih dari 0.")
  if (modal === null || modal < 0 || modal > BATAS_RUPIAH) return gagal("Harga modal harus angka bulat, tidak boleh negatif.")
  const stokAwal = p.stok === undefined ? 0 : bulat(p.stok)
  if (stokAwal === null || stokAwal < 0 || stokAwal > 1_000_000) return gagal("Stok harus angka bulat, tidak boleh negatif.")
  if (!["Persentase", "Nominal tetap"].includes(p.skema)) return gagal("Skema tidak valid.")
  const s = p.shares || {}, n = p.nominalShares || {}
  if (p.skema === "Persentase" && Math.abs(Number(s.barber) + Number(s.seller) + Number(s.eastville) - 100) > 0.5)
    return gagal("Total pembagian persentase harus 100%.")
  if (p.skema === "Nominal tetap" && Number(n.barber) + Number(n.seller) + Number(n.eastville) !== Number(p.harga))
    return gagal("Total pembagian nominal harus sama dengan harga jual.")

  const kode = String(p.kode).trim()
  const baris: Record<string, string | number> = {
    kode, nama: p.nama, penjual: p.penjual || "", skema: p.skema,
    status: p.status === "Nonaktif" ? "Nonaktif" : "Aktif",
    harga: toInt(p.harga), harga_modal: toInt(p.hargaModal),
    persen_kapster: Number(s.barber) || 0, persen_penjual: Number(s.seller) || 0, persen_eastville: Number(s.eastville) || 0,
    nominal_kapster: toInt(n.barber), nominal_penjual: toInt(n.seller), nominal_eastville: toInt(n.eastville),
  }
  const { data: semua } = await db.from("produk").select("*")
  const ada = (semua ?? []).find((x) => String(x.kode).toLowerCase() === kode.toLowerCase())
  if (ada && body.baru === true) return gagal(`Kode produk '${kode}' sudah dipakai produk lain.`)

  if (ada) {
    if (!alasan) return gagal("Alasan perubahan wajib diisi.")
    baris.kode = ada.kode
    const beda: string[] = []
    const ubah: Record<string, string | number> = {}
    for (const k of Object.keys(baris)) {
      if (String(ada[k]) !== String(baris[k])) { beda.push(`${k} ${ada[k]} → ${baris[k]}`); ubah[k] = baris[k] }
    }
    if (beda.length) {
      await db.from("produk").update(ubah).eq("kode", ada.kode)
      await db.from("produk_log").insert({ kode: ada.kode, produk: p.nama, perubahan: beda.join("; "), oleh: oleh(user), alasan })
      await tulisAudit(user.id, user.nama, "UBAH_PRODUK", `${ada.kode}: ${beda.join("; ")}`)
    }
    return ok({ kode: ada.kode })
  }
  const stok = Math.max(0, toInt(p.stok))
  if (stok === 0) baris.status = "Nonaktif" // stok kosong tidak boleh tampil di Kasir; restok pertama mengaktifkannya
  const { error } = await db.from("produk").insert({ ...baris, stok })
  if (error) throw new Error(error.message)
  if (stok > 0)
    await db.from("stok_mutasi").insert({ kode, delta: stok, stok_akhir: stok, alasan: "Stok awal", oleh: oleh(user) })
  await db.from("produk_log").insert({ kode, produk: p.nama, perubahan: "Produk baru", oleh: oleh(user), alasan: alasan || "Produk baru" })
  await tulisAudit(user.id, user.nama, "TAMBAH_PRODUK", kode)
  return ok({ kode })
}

export async function hapusProduk(body: B, user: Pengguna) {
  const { data: semua } = await db.from("produk").select("kode,nama")
  const pr = (semua ?? []).find((x) => String(x.kode).toLowerCase() === String(body.kode ?? "").toLowerCase())
  if (!pr) return gagal("Produk tidak ditemukan.")
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan penghapusan wajib diisi.")
  await db.from("produk").delete().eq("kode", pr.kode)
  await db.from("produk_log").insert({ kode: pr.kode, produk: pr.nama, perubahan: "Produk dihapus", oleh: oleh(user), alasan })
  await tulisAudit(user.id, user.nama, "HAPUS_PRODUK", `${pr.kode} · ${alasan}`)
  return ok({ kode: pr.kode })
}

export async function adjustStok(body: B, user: Pengguna) {
  const delta = bulat(body.delta)
  const alasan = String(body.alasan ?? "").trim()
  if (delta === null) return gagal("Jumlah stok harus angka bulat.")
  if (delta === 0) return gagal("Perubahan stok tidak boleh 0.")
  if (Math.abs(delta) > 1_000_000) return gagal("Jumlah perubahan stok terlalu besar.")
  if (!alasan) return gagal("Alasan wajib diisi.")
  const { data: p } = await db.from("produk").select("kode,stok").eq("kode", body.kode).maybeSingle()
  if (!p) return gagal("Produk tidak ditemukan.")
  if (Number(p.stok) + delta < 0) return gagal("Stok tidak boleh negatif.")
  const akhir = await mutasiStok(p.kode, delta, alasan, "", user)
  await tulisAudit(user.id, user.nama, "ADJUST_STOK", `${p.kode} ${delta > 0 ? "+" : ""}${delta} — ${alasan}`)
  return ok({ kode: p.kode, stok: akhir })
}

export async function logProduk() {
  const { data } = await db.from("produk_log").select("waktu,kode,produk,perubahan,oleh,alasan").order("id", { ascending: false })
  return ok(data ?? [])
}
