// Padanan listLayanan_, simpanLayanan_, hapusLayanan_, listKapster_, listProduk_,
// simpanPengaturan_, setKomisiKapster_ di Bisnis.js.
import { db, gagal, ok, tulisAudit, type Pengguna } from "../util.ts"
import { bentukPengaturan, getPengaturan, parseHhmm } from "../pengaturan.ts"

const KATEGORI_LAYANAN = ["Potong", "Perawatan", "Coloring", "Styling", "Grooming"]
const toInt = (v: unknown) => {
  const n = Math.round(Number(v))
  return isNaN(n) ? 0 : n
}
type B = Record<string, any> // deno-lint-ignore-line no-explicit-any

export async function listLayanan() {
  const { data } = await db.from("layanan").select("id,nama,harga,status,kategori").order("id")
  return ok(data ?? [])
}

export async function listKapster() {
  const { data } = await db.from("users").select("id,nama").eq("role", "Kapster").eq("status", "Aktif").order("dibuat")
  return ok(data ?? [])
}

const KOLOM_PRODUK_UMUM = "kode,nama,penjual,stok,skema,status,harga"
const KOLOM_PRODUK_OWNER = KOLOM_PRODUK_UMUM + ",harga_modal,persen_kapster,persen_penjual,persen_eastville,nominal_kapster,nominal_penjual,nominal_eastville"

/** Harga modal dan bagi hasil (Eastville/penjual/kapster) hanya untuk Owner; Kasir dan Kapster cukup data jual. */
export async function listProduk(user?: Pengguna) {
  const { data } = await db.from("produk").select(user?.role === "Owner" ? KOLOM_PRODUK_OWNER : KOLOM_PRODUK_UMUM).order("urut")
  return ok(data ?? [])
}

export async function simpanLayanan(body: B, user: Pengguna) {
  const l = body.layanan || {}
  const nama = String(l.nama ?? "").trim()
  const hargaMentah = Number(l.harga)
  const harga = Math.round(hargaMentah)
  const status = l.status === "Nonaktif" ? "Nonaktif" : "Aktif"
  const kategori = KATEGORI_LAYANAN.includes(l.kategori) ? l.kategori : "Potong"
  if (!nama) return gagal("Nama layanan wajib diisi.")
  if (!Number.isInteger(hargaMentah) || hargaMentah <= 0 || hargaMentah > 1_000_000_000)
    return gagal("Harga harus angka bulat lebih dari 0.")
  if (nama.length > 80) return gagal("Nama layanan maksimal 80 karakter.")

  const { data: semua } = await db.from("layanan").select("id,nama,harga,status,kategori")
  const adaId = l.id !== undefined && l.id !== ""
  if ((semua ?? []).some((x) => x.nama.toLowerCase() === nama.toLowerCase() && String(x.id) !== String(l.id)))
    return gagal("Layanan dengan nama itu sudah ada.")

  if (adaId) {
    const lama = (semua ?? []).find((x) => String(x.id) === String(l.id))
    if (!lama) return gagal("Layanan tidak ditemukan.")
    await db.from("layanan").update({ nama, harga, status, kategori }).eq("id", lama.id)
    await tulisAudit(user.id, user.nama, "UBAH_LAYANAN",
      `${lama.nama} Rp ${lama.harga} ${lama.status} ${lama.kategori} → ${nama} Rp ${harga} ${status} ${kategori}`)
    return ok({ id: lama.id })
  }
  const { data, error } = await db.from("layanan").insert({ nama, harga, status, kategori }).select("id").single()
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "TAMBAH_LAYANAN", `${nama} Rp ${harga} ${kategori}`)
  return ok({ id: data.id })
}

export async function hapusLayanan(body: B, user: Pengguna) {
  const { data: lay } = await db.from("layanan").select("id,nama").eq("id", body.id).maybeSingle()
  if (!lay) return gagal("Layanan tidak ditemukan.")
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan penghapusan wajib diisi.")
  await db.from("layanan").delete().eq("id", lay.id)
  await tulisAudit(user.id, user.nama, "HAPUS_LAYANAN", `${lay.nama} · ${alasan}`)
  return ok({ id: lay.id })
}

export async function getPengaturanAksi() {
  return ok(await bentukPengaturan())
}

export async function simpanPengaturan(body: B, user: Pengguna) {
  const mulai = parseHhmm(body.jamMulai), selesai = parseHhmm(body.jamSelesai)
  if (mulai === null || selesai === null) return gagal("Format jam harus HH:MM, contoh 10:00.")
  if (mulai >= selesai) return gagal("Jam selesai harus setelah jam mulai.")
  const kd = Number(body.komisiDefault), kl = Number(body.komisiLembur)
  if (isNaN(kd) || isNaN(kl) || kd < 0 || kd > 100 || kl < 0 || kl > 100) return gagal("Persen komisi harus 0-100.")
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan perubahan wajib diisi.")

  const lama = await getPengaturan()
  const baru: Record<string, number> = { jam_mulai: mulai, jam_selesai: selesai, komisi_default: kd, komisi_lembur: kl }
  const beda: string[] = []
  for (const k of Object.keys(baru)) {
    if (Number(lama[k]) !== baru[k]) {
      beda.push(`${k} ${lama[k]} → ${baru[k]}`)
      await db.from("pengaturan").upsert({ key: k, value: String(baru[k]) })
    }
  }
  if (beda.length) await tulisAudit(user.id, user.nama, "UBAH_PENGATURAN", beda.join("; ") + " — " + alasan)
  return ok(await bentukPengaturan())
}

export async function setKomisiKapster(body: B, user: Pengguna) {
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan perubahan komisi wajib diisi.")
  const { data: kap } = await db.from("users").select("id,nama").eq("id", body.userId).eq("role", "Kapster").maybeSingle()
  if (!kap) return gagal("Kapster tidak ditemukan.")
  const kosong = body.persen === null || body.persen === "" || body.persen === undefined
  const persen = kosong ? null : Number(body.persen)
  if (persen !== null && (isNaN(persen) || persen < 0 || persen > 100)) return gagal("Persen komisi harus 0-100.")
  await db.from("komisi_kapster").upsert({
    user_id: body.userId, persen, diubah_oleh: `${user.nama} · ${user.role}`, waktu: new Date().toISOString(),
  })
  await tulisAudit(user.id, user.nama, "UBAH_KOMISI_KAPSTER",
    `${kap.nama}: ${persen === null ? "default" : persen + "%"} — ${alasan}`)
  return ok(await bentukPengaturan())
}
