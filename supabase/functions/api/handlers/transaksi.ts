// Padanan createTransaksi_, listTransaksi_, listKomisi_, batalkan/pulihkanTransaksi_,
// dan PENGELUARAN di Bisnis.js.
import {
  ambilSemua, db, fmtDdMmYy, fmtJamTitik, fmtTglJam, fmtTglJamPanjang, fmtTglPanjang, fmtTglPendek,
  gagal, jamAngka, jamDetik, ok, potong, tanggalIso, tanggalValid, tulisAudit, type Pengguna,
} from "../util.ts"
import { getPengaturan, isLembur, komisiOverride, parseHhmm, PENGATURAN_DEFAULT } from "../pengaturan.ts"
import { catatPemakaianKode, cekKodeDiskon, cekPinOtorisasi } from "./diskon.ts"
import { mutasiStok } from "./produk.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const toInt = (v: unknown) => { const n = Math.round(Number(v)); return isNaN(n) ? 0 : n }
const oleh = (u: Pengguna) => `${u.nama} · ${u.role}`
const KATEGORI_PENGELUARAN = ["Perlengkapan", "Listrik", "Air", "Sewa", "Lain-lain"]

/**
 * Terapkan perubahan stok satu per satu. Bila salah satu gagal (mis. dua kasir menjual stok terakhir bersamaan),
 * perubahan yang sudah masuk dibalikkan dan pesan kesalahan dikembalikan ("" = berhasil).
 */
async function terapkanStok(perubahan: { kode: string; delta: number; alasan: string }[], trxId: string, user: Pengguna) {
  const sudah: { kode: string; delta: number }[] = []
  for (const p of perubahan) {
    if (!p.delta) continue
    try {
      await mutasiStok(p.kode, p.delta, p.alasan, trxId, user)
      sudah.push(p)
    } catch (e) {
      for (const u of sudah.reverse()) await mutasiStok(u.kode, -u.delta, "Batal otomatis " + trxId, trxId, user).catch(() => {})
      const m = (e as Error).message
      if (m.includes("STOK_KURANG")) return `Stok ${p.kode} tidak cukup (baru saja dipakai transaksi lain). Muat ulang lalu coba lagi.`
      throw e
    }
  }
  return ""
}

/** Nomor invoice: INV-DDMMYY-NNNN, urut per hari. */
async function nextInvoiceId(now: Date) {
  const prefix = `INV-${fmtDdMmYy(now)}-`
  const { data } = await db.from("transaksi").select("id").like("id", prefix + "%").order("id", { ascending: false }).limit(1)
  const last = parseInt((data?.[0]?.id ?? "").slice(prefix.length), 10) || 0
  return prefix + String(last + 1).padStart(4, "0")
}

function komisiProduk(p: B, qty: number) {
  const perUnit = p.skema === "Persentase"
    ? Math.round((Number(p.harga) * Number(p.persen_kapster)) / 100)
    : Number(p.nominal_kapster)
  return perUnit * qty
}

async function buatTransaksi(body: B, user: Pengguna, manual: boolean) {
  const items: B[] = body.items || []
  if (!items.length) return gagal("Keranjang kosong.")
  // Permintaan ulang (klik dobel / jaringan putus lalu kirim lagi) mengembalikan transaksi yang sama, tahan restart server.
  const reqKey = !manual && body.clientRequestId ? "req_" + String(body.clientRequestId).slice(0, 60) : ""
  if (reqKey) {
    const { data: lama } = await db.from("transaksi").select("id,total,bayar_tunai,bayar_qris,lembur")
      .eq("req_id", reqKey).eq("dibuat_oleh_id", user.id).maybeSingle()
    if (lama) return ok({ id: lama.id, total: Number(lama.total),
      kembalian: Number(lama.bayar_tunai) + Number(lama.bayar_qris) - Number(lama.total), lembur: lama.lembur === "Ya" })
  }
  if (!["Tunai", "QRIS", "Gabungan"].includes(body.metode)) return gagal("Metode pembayaran tidak valid.")

  const [{ data: lay }, { data: prod }, peng, override, { data: kap }] = await Promise.all([
    db.from("layanan").select("*"), db.from("produk").select("*"), getPengaturan(), komisiOverride(),
    db.from("users").select("id,nama").eq("role", "Kapster").eq("status", "Aktif"),
  ])
  const layananMap = new Map((lay ?? []).map((l) => [String(l.id), l]))
  const produkMap = new Map((prod ?? []).map((p) => [String(p.kode), p]))
  const kapsterMap = new Map((kap ?? []).map((u) => [u.id, u.nama]))

  let now = new Date()
  let notaBuku = ""
  if (manual) {
    const tgl = String(body.tanggal ?? "")
    const jamIn = String(body.jam ?? "12:00")
    if (!tanggalValid(tgl)) return gagal("Tanggal transaksi tidak valid.")
    if (parseHhmm(jamIn) === null) return gagal("Format jam harus HH:MM.")
    if (tgl > tanggalIso()) return gagal("Tanggal tidak boleh di masa depan.")
    notaBuku = String(body.nomorNota ?? "").trim().toUpperCase()
    if (notaBuku.length < 3) return gagal("Nomor nota dari buku wajib diisi.")
    const { data: pakai } = await db.from("transaksi").select("id").or(`id.eq.${notaBuku},nota_buku.eq.${notaBuku}`).limit(1)
    if (pakai?.length) return gagal("Nomor nota sudah dipakai.")
    now = new Date(`${tgl}T${jamIn.padStart(5, "0")}:00+07:00`)
  }
  // Kasir POS: kapster pada tiap item wajib sudah absen Hadir hari ini (Input Manual untuk tanggal lampau dikecualikan).
  if (!manual) {
    const ids = [...new Set(items.map((it) => String(it.kapsterId ?? "")))]
    const { data: abs } = await db.from("absensi").select("user_id,status,waktu")
      .eq("tanggal", tanggalIso()).in("user_id", ids).order("waktu", { ascending: false })
    const terakhir = new Map<string, string>()
    for (const r of abs ?? []) if (!terakhir.has(r.user_id)) terakhir.set(r.user_id, r.status)
    for (const id of ids) {
      const nama = kapsterMap.get(id)
      if (nama && terakhir.get(id) === "Sakit")
        return gagal(`Kapster ${nama} tercatat sakit hari ini. Transaksi baru tidak dapat dibuat.`)
      if (nama && terakhir.get(id) !== "Hadir")
        return gagal(`Kapster ${nama} belum absen hari ini. Lakukan absensi dulu, lalu bayar.`)
    }
  }
  const nowJam = jamAngka(now)
  const pilihan = body.komisiLayanan
  if (pilihan && pilihan !== "Normal" && pilihan !== "OT") return gagal("Pilihan komisi layanan tidak valid.")
  const lembur = pilihan ? pilihan === "OT" : isLembur(nowJam, peng)

  let subtotal = 0, komisiTotal = 0
  const lines: B[] = []
  const stokBaru: Record<string, number> = {}
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const qty = toInt(it.qty)
    if (qty < 1) return gagal("Qty tidak valid.")
    const namaKapster = kapsterMap.get(it.kapsterId)
    if (!namaKapster) return gagal(`Kapster tidak ditemukan untuk item ke-${i + 1}.`)

    if (it.tipe === "Layanan") {
      const l = layananMap.get(String(it.refId))
      if (!l || l.status !== "Aktif") return gagal("Layanan tidak tersedia.")
      const hargaL = Number(l.harga) * qty
      const persenNormal = override[it.kapsterId] !== undefined ? override[it.kapsterId] : peng.komisi_default
      const persenL = lembur ? peng.komisi_lembur : persenNormal
      const kom = Math.round((hargaL * persenL) / 100)
      subtotal += hargaL; komisiTotal += kom
      lines.push({ tipe: "Layanan", ref_id: String(l.id), nama: l.nama, qty, harga: Number(l.harga),
        kapster_id: it.kapsterId, kapster: namaKapster, komisi: kom, komisi_persen: persenL })
    } else if (it.tipe === "Produk") {
      const p = produkMap.get(String(it.refId))
      if (!p || p.status !== "Aktif") return gagal("Produk tidak tersedia.")
      const sisa = (stokBaru[p.kode] === undefined ? Number(p.stok) : stokBaru[p.kode]) - qty
      if (sisa < 0) return gagal(`Stok ${p.nama} tidak cukup.`)
      stokBaru[p.kode] = sisa
      const hargaP = Number(p.harga) * qty
      const komP = komisiProduk(p, qty)
      subtotal += hargaP; komisiTotal += komP
      lines.push({ tipe: "Produk", ref_id: p.kode, nama: p.nama, qty, harga: Number(p.harga),
        kapster_id: it.kapsterId, kapster: namaKapster, komisi: komP, komisi_persen: 0 })
    } else return gagal("Tipe item tidak dikenal.")
  }

  // Diskon dihitung server dari kode unik; angka diskon dari klien tidak dipercaya.
  let diskon = 0, kodeDipakai = ""
  const kodeInput = String(body.kodeDiskon ?? "").trim()
  if (kodeInput) {
    const cek = await cekKodeDiskon(kodeInput, subtotal, manual ? tanggalIso(now) : undefined)
    if ("error" in cek) return gagal(cek.error!)
    diskon = cek.diskon!; kodeDipakai = cek.kode!
  } else if (toInt(body.diskon) > 0 && user.role === "Kasir") {
    if (!manual) return gagal("Diskon hanya bisa lewat kode diskon yang valid.")
    const salahPin = await cekPinOtorisasi(user, body.pinOtorisasi)
    if (salahPin) return gagal(salahPin)
    diskon = Math.min(Math.max(0, toInt(body.diskon)), subtotal)
  } else diskon = Math.min(Math.max(0, toInt(body.diskon)), subtotal)

  const gratis = body.gratis === true
  const alasanGratis = String(body.alasan ?? "").trim()
  if (gratis) {
    if (!alasanGratis) return gagal("Alasan transaksi gratis wajib diisi.")
    diskon = subtotal
  }
  const total = subtotal - diskon
  if (total === 0 && !gratis) return gagal("Total Rp0 hanya untuk transaksi gratis. Pilih Gratis dan isi alasannya.")
  let tunai = toInt(body.bayarTunai), qris = toInt(body.bayarQris)
  if (body.metode === "Tunai") qris = 0
  if (body.metode === "QRIS") { tunai = 0; qris = total }
  if (gratis) { tunai = 0; qris = 0 }
  if (tunai < 0 || qris < 0) return gagal("Nominal pembayaran tidak valid.")
  if (body.metode === "Gabungan") {
    if (qris > total) return gagal("Nominal QRIS melebihi total nota.")
    if (tunai > total - qris) tunai = total - qris
  }
  if (tunai + qris < total) return gagal(`Pembayaran kurang Rp ${total - tunai - qris}.`)

  // Nomor invoice: ulangi bila bentrok dengan transaksi lain yang masuk bersamaan.
  let id = manual ? notaBuku : ""
  for (let coba = 0; coba < 6; coba++) {
    if (!manual) id = await nextInvoiceId(now)
    const { error } = await db.from("transaksi").insert({
      id, waktu: now.toISOString(), tanggal: tanggalIso(now), jam: fmtJamTitik(now), metode: body.metode,
      subtotal, diskon, total, bayar_tunai: tunai, bayar_qris: qris, komisi_total: komisiTotal, status: "Lunas",
      dibuat_oleh_id: user.id, dibuat_oleh: oleh(user), lembur: lembur ? "Ya" : "Tidak",
      manual: manual ? "Ya" : "", nota_buku: notaBuku, gratis: gratis ? alasanGratis : "", req_id: reqKey || null,
    })
    if (!error) break
    if (error.code === "23505" && error.message.includes("transaksi_req_id_uniq")) return buatTransaksi(body, user, manual)
    if (error.code === "23505" && manual) return gagal("Nomor nota sudah dipakai.")
    if (error.code !== "23505" || coba === 5) throw new Error(error.message)
  }
  const { error: eItem } = await db.from("transaksi_item").insert(lines.map((ln) => ({ ...ln, trx_id: id })))
  if (eItem) { await db.from("transaksi").delete().eq("id", id); throw new Error(eItem.message) }
  const salahStok = await terapkanStok(
    Object.keys(stokBaru).map((kode) => ({ kode, delta: stokBaru[kode] - Number(produkMap.get(kode)!.stok), alasan: "Penjualan" })), id, user)
  if (salahStok) { await db.from("transaksi").delete().eq("id", id); return gagal(salahStok) }

  await tulisAudit(user.id, user.nama, manual ? "REKAP_MANUAL" : "TRANSAKSI",
    `${id} total ${total}${gratis ? " GRATIS: " + alasanGratis : ""}`)
  await catatPemakaianKode(kodeDipakai)
  return ok({ id, total, kembalian: tunai + qris - total, lembur })
}

export const createTransaksi = (b: B, u: Pengguna) => buatTransaksi(b, u, false)
export const createTransaksiManual = (b: B, u: Pengguna) => buatTransaksi(b, u, true)

function bentukTransaksi(t: B, items: B[]) {
  const kapsters = new Set(items.map((i) => i.kapster))
  const layananTotal = items.filter((i) => i.tipe === "Layanan").reduce((a, i) => a + i.harga * i.qty, 0)
  const adaProduk = items.some((i) => i.tipe === "Produk")
  let persenNote: number = PENGATURAN_DEFAULT.komisi_default
  for (const i of items) if (i.tipe === "Layanan" && i.komisi_persen !== null && i.komisi_persen !== "") persenNote = Number(i.komisi_persen)
  const lemburNote = t.lembur === "Ya" ? " (lembur)" : ""
  const catatan = items.length && !adaProduk
    ? `${persenNote}%${lemburNote} total layanan Rp ${layananTotal}` : `Layanan + produk${lemburNote}`
  const w = new Date(t.waktu)
  return {
    id: t.id, date: fmtTglPanjang(w), time: fmtJamTitik(w),
    items: items.map((i) => ({
      name: i.nama, qty: i.qty, price: Number(i.harga), type: i.tipe,
      refId: i.ref_id, kapsterId: i.kapster_id, kapster: i.kapster,
    })),
    barber: [...kapsters].join(", "), method: t.metode, commission: Number(t.komisi_total),
    commissionNote: catatan, overtime: t.lembur === "Ya",
    subtotal: Number(t.subtotal), discount: Number(t.diskon), total: Number(t.total),
    bayarTunai: Number(t.bayar_tunai) || 0, bayarQris: Number(t.bayar_qris) || 0,
    gratis: t.gratis || undefined,
    status: t.status === "Lunas" && t.manual === "Ya" ? "Manual" : t.status,
    createdTime: fmtTglJam(w), createdBy: t.dibuat_oleh,
    voidReason: t.void_alasan || undefined, voidBy: t.void_oleh || undefined,
    voidTime: t.void_waktu ? fmtTglJamPanjang(new Date(t.void_waktu)) + " WIB" : undefined,
  }
}

export async function listTransaksi(body: B, user: Pengguna) {
  const trx = await ambilSemua(() => {
    let q = db.from("transaksi").select("*").order("waktu", { ascending: false }).order("id")
    if (body.dari) q = q.gte("tanggal", body.dari)
    if (body.sampai) q = q.lte("tanggal", body.sampai)
    if (user.role === "Kasir") q = q.eq("dibuat_oleh_id", user.id)
    return q
  }, 20_000)
  const per: Record<string, B[]> = {}
  for (const bag of potong(trx.map((t) => t.id), 200)) {
    const its = await ambilSemua(() => db.from("transaksi_item").select("*").in("trx_id", bag).order("id"))
    for (const it of its) (per[it.trx_id] ??= []).push(it)
  }
  return ok(trx.map((t) => bentukTransaksi(t, per[t.id] ?? [])))
}

export async function listKomisi(body: B, user: Pengguna) {
  const kapsterId = user.role === "Kapster" ? user.id : body.kapsterId || ""
  const trx = await ambilSemua(() => {
    let q = db.from("transaksi").select("id,lembur").eq("status", "Lunas").order("id")
    if (body.dari) q = q.gte("tanggal", body.dari)
    if (body.sampai) q = q.lte("tanggal", body.sampai)
    return q
  })
  const lemburTrx = new Set(trx.filter((t) => t.lembur === "Ya").map((t) => t.id))
  const per: Record<string, B> = {}
  for (const bag of potong(trx.map((t) => t.id), 200)) {
    const its = await ambilSemua(() => {
      let qi = db.from("transaksi_item").select("*").in("trx_id", bag).order("id")
      if (kapsterId) qi = qi.eq("kapster_id", kapsterId)
      return qi
    })
    for (const it of its) {
      const r = (per[it.kapster_id] ??= {
        kapsterId: it.kapster_id, kapster: it.kapster, jumlahTransaksi: 0, trx: new Set<string>(),
        komisiLayanan: 0, komisiLembur: 0, komisiProduk: 0, totalKomisi: 0, penjualanLayanan: 0, penjualanProduk: 0,
      })
      const kom = Number(it.komisi) || 0, nilai = Number(it.harga) * Number(it.qty)
      r.trx.add(it.trx_id)
      if (it.tipe === "Produk") { r.komisiProduk += kom; r.penjualanProduk += nilai }
      else { if (lemburTrx.has(it.trx_id)) r.komisiLembur += kom; else r.komisiLayanan += kom; r.penjualanLayanan += nilai }
      r.totalKomisi += kom
    }
  }
  const hasil = Object.values(per).map((r) => { r.jumlahTransaksi = r.trx.size; delete r.trx; return r })
  hasil.sort((a, b) => b.totalKomisi - a.totalKomisi)
  return ok(hasil)
}

export async function batalkanTransaksi(body: B, user: Pengguna) {
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan pembatalan wajib diisi.")
  const { data: t } = await db.from("transaksi").select("*").eq("id", body.id).maybeSingle()
  if (!t) return gagal("Transaksi tidak ditemukan.")
  if (t.status === "BATAL") return gagal("Transaksi sudah dibatalkan.")
  if (user.role === "Kasir" && t.dibuat_oleh_id !== user.id) return gagal("Kasir hanya boleh membatalkan transaksinya sendiri.")
  // Klaim dulu lewat UPDATE bersyarat: dua klik bersamaan tidak mengembalikan stok dua kali.
  const { data: klaim } = await db.from("transaksi").update({
    status: "BATAL", void_alasan: alasan, void_oleh: oleh(user), void_waktu: new Date().toISOString(),
  }).eq("id", t.id).neq("status", "BATAL").select("id")
  if (!klaim?.length) return gagal("Transaksi sudah dibatalkan.")
  const { data: its } = await db.from("transaksi_item").select("tipe,ref_id,qty,gaji_id").eq("trx_id", t.id)
  for (const i of (its ?? []).filter((x) => x.tipe === "Produk"))
    await mutasiStok(i.ref_id, Number(i.qty), "Batal " + t.id, t.id, user)
  const sudahGaji = (its ?? []).some((i) => i.gaji_id)
  await tulisAudit(user.id, user.nama, "VOID_TRANSAKSI",
    `${t.id} — ${alasan}${sudahGaji ? " (PERHATIAN: komisinya sudah dibayarkan lewat gaji)" : ""}`)
  return ok({ id: t.id, status: "BATAL" })
}

export async function pulihkanTransaksi(body: B, user: Pengguna) {
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan wajib diisi.")
  const { data: t } = await db.from("transaksi").select("*").eq("id", body.id).maybeSingle()
  if (!t) return gagal("Transaksi tidak ditemukan.")
  if (t.status !== "BATAL") return gagal("Hanya transaksi BATAL yang bisa dipulihkan.")
  const { data: its } = await db.from("transaksi_item").select("ref_id,qty,nama").eq("trx_id", t.id).eq("tipe", "Produk")
  const { data: prod } = await db.from("produk").select("kode,stok")
  const stok = new Map((prod ?? []).map((p) => [p.kode, Number(p.stok)]))
  for (const i of its ?? []) {
    if ((stok.get(i.ref_id) ?? -1) < Number(i.qty)) return gagal(`Stok ${i.nama} tidak cukup untuk memulihkan transaksi.`)
  }
  const { data: klaim } = await db.from("transaksi").update({ status: "Lunas", void_alasan: "", void_oleh: "", void_waktu: null })
    .eq("id", t.id).eq("status", "BATAL").select("id")
  if (!klaim?.length) return gagal("Transaksi sudah dipulihkan.")
  const salah = await terapkanStok((its ?? []).map((i) => ({ kode: i.ref_id, delta: -Number(i.qty), alasan: "Pulihkan " + t.id })), t.id, user)
  if (salah) {
    await db.from("transaksi").update({ status: "BATAL", void_alasan: alasan, void_oleh: oleh(user), void_waktu: new Date().toISOString() }).eq("id", t.id)
    return gagal(salah)
  }
  await tulisAudit(user.id, user.nama, "PULIHKAN_TRANSAKSI", `${t.id} — ${alasan}`)
  return ok({ id: t.id, status: "Lunas" })
}

export async function updateTransaksi(body: B, user: Pengguna) {
  const trxId = String(body.id ?? "").trim()
  if (!trxId) return gagal("ID transaksi wajib diisi.")
  const { data: t } = await db.from("transaksi").select("*").eq("id", trxId).maybeSingle()
  if (!t) return gagal("Transaksi tidak ditemukan.")
  if (t.status === "BATAL") return gagal("Transaksi yang sudah dibatalkan tidak dapat diedit.")
  if (user.role === "Kasir" && t.dibuat_oleh_id !== user.id) return gagal("Kasir hanya boleh mengedit transaksi yang dibuat sendiri.")
  if (user.role === "Kasir" && t.tanggal !== tanggalIso()) return gagal("Kasir hanya boleh mengedit transaksi pada hari yang sama sebelum shift tutup.")

  const items: B[] = body.items || []
  if (!items.length) return gagal("Item transaksi tidak boleh kosong.")

  const alasanEdit = String(body.alasanEdit ?? "").trim() || "Perubahan item transaksi"

  const [{ data: lay }, { data: prod }, peng, override, { data: kap }] = await Promise.all([
    db.from("layanan").select("*"), db.from("produk").select("*"), getPengaturan(), komisiOverride(),
    db.from("users").select("id,nama").eq("role", "Kapster"),
  ])
  const layananMap = new Map((lay ?? []).map((l: B) => [String(l.id), l]))
  const produkMap = new Map((prod ?? []).map((p: B) => [String(p.kode), p]))
  const kapsterMap = new Map((kap ?? []).map((u: B) => [u.id, u.nama]))

  // Stok efektif untuk validasi = stok sekarang + qty lama transaksi ini (belum ada yang diubah di database).
  const { data: oldItems } = await db.from("transaksi_item").select("*").eq("trx_id", t.id)
  // komisi yang sudah dibayarkan lewat gaji tidak boleh berubah/hilang diam-diam
  const sudahGaji = (oldItems ?? []).some((i: B) => i.gaji_id)
  if (sudahGaji) return gagal("Komisi transaksi ini sudah dibayarkan lewat gaji, jadi item tidak bisa diubah. Batalkan lalu catat ulang bila perlu.")
  const qtyLama: Record<string, number> = {}
  for (const old of (oldItems ?? []).filter((i: B) => i.tipe === "Produk")) qtyLama[old.ref_id] = (qtyLama[old.ref_id] || 0) + Number(old.qty)
  const stokSekarang = (kode: string) => Number(produkMap.get(kode)?.stok ?? 0)

  const lembur = t.lembur === "Ya"
  let subtotal = 0, komisiTotal = 0
  const lines: B[] = []
  const stokBaru: Record<string, number> = {}

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const qty = toInt(it.qty)
    if (qty < 1) return gagal("Qty tidak valid.")
    const namaKapster = kapsterMap.get(it.kapsterId) || it.kapster
    if (!namaKapster) return gagal(`Kapster tidak ditemukan untuk item ke-${i + 1}.`)
    const kapsterId = it.kapsterId || [...kapsterMap.entries()].find(([, v]) => v === namaKapster)?.[0] || ""

    const tipe = it.tipe || it.type
    if (tipe === "Layanan") {
      const l = layananMap.get(String(it.refId || it.ref_id || "")) || (lay ?? []).find((x: B) => x.nama === it.nama || x.nama === it.name)
      if (!l || l.status !== "Aktif") return gagal(`Layanan ${it.nama || it.name || ""} tidak tersedia.`)
      const hargaL = Number(l.harga) * qty
      const persenL = lembur ? peng.komisi_lembur
        : override[kapsterId] !== undefined ? override[kapsterId] : peng.komisi_default
      const kom = Math.round((hargaL * persenL) / 100)
      subtotal += hargaL; komisiTotal += kom
      lines.push({ tipe: "Layanan", ref_id: String(l.id), nama: l.nama, qty, harga: Number(l.harga),
        kapster_id: kapsterId, kapster: namaKapster, komisi: kom, komisi_persen: persenL })
    } else if (tipe === "Produk") {
      const p = produkMap.get(String(it.refId || it.ref_id || "")) || (prod ?? []).find((x: B) => x.nama === it.nama || x.nama === it.name)
      // produk yang sudah ada di transaksi ini (mis. stok habis lalu otomatis Nonaktif) tetap boleh dipertahankan
      if (!p || (p.status !== "Aktif" && !(p.kode in qtyLama))) return gagal(`Produk ${it.nama || it.name || ""} tidak tersedia.`)
      const currentStok = stokBaru[p.kode] !== undefined ? stokBaru[p.kode] : stokSekarang(p.kode) + (qtyLama[p.kode] || 0)
      const sisa = currentStok - qty
      if (sisa < 0) return gagal(`Stok ${p.nama} tidak cukup (sisa: ${currentStok}).`)
      stokBaru[p.kode] = sisa
      const hargaP = Number(p.harga) * qty
      const komP = komisiProduk(p, qty)
      subtotal += hargaP; komisiTotal += komP
      lines.push({ tipe: "Produk", ref_id: p.kode, nama: p.nama, qty, harga: Number(p.harga),
        kapster_id: kapsterId, kapster: namaKapster, komisi: komP, komisi_persen: 0 })
    } else return gagal("Tipe item tidak dikenal.")
  }

  // Semua validasi lolos: baru stok disesuaikan (selisih bersih per produk, satu mutasi per produk).
  const kodeSemua = new Set([...Object.keys(qtyLama), ...Object.keys(stokBaru)])
  // stokBaru[kode] = sisa stok setelah transaksi hasil edit; produk yang dibuang dari transaksi dikembalikan penuh.
  const salahStok = await terapkanStok([...kodeSemua].map((kode) => ({
    kode, delta: stokBaru[kode] !== undefined ? stokBaru[kode] - stokSekarang(kode) : (qtyLama[kode] || 0),
    alasan: "Edit Penjualan " + t.id })), t.id, user)
  if (salahStok) return gagal(salahStok)

  const diskon = Math.min(Number(t.diskon) || 0, subtotal)
  const total = subtotal - diskon
  const metode = body.metode || t.metode
  let tunai = toInt(body.bayarTunai ?? t.bayar_tunai)
  let qris = toInt(body.bayarQris ?? t.bayar_qris)
  if (metode === "Tunai") {
    tunai = Math.max(total, toInt(body.bayarTunai ?? total))
    qris = 0
  } else if (metode === "QRIS") {
    tunai = 0
    qris = total
  } else if (metode === "Gabungan") {
    if (qris > total) qris = total
    tunai = total - qris
  }

  // 3. Simpan baris item baru
  await db.from("transaksi_item").delete().eq("trx_id", t.id)
  const { error: eIns } = await db.from("transaksi_item").insert(lines.map((ln) => ({ ...ln, trx_id: t.id })))
  if (eIns) throw new Error(eIns.message)

  // 4. Update transaksi
  await db.from("transaksi").update({
    subtotal, diskon, total, bayar_tunai: tunai, bayar_qris: qris, komisi_total: komisiTotal, metode,
  }).eq("id", t.id)

  await tulisAudit(user.id, user.nama, "EDIT_TRANSAKSI", `${t.id} — ${alasanEdit} (Total baru: ${total})`)

  return ok({ id: t.id, total, subtotal, komisiTotal, items: lines })
}

// ---- Pengeluaran ----
export async function listPengeluaran() {
  const data = await ambilSemua(() => db.from("pengeluaran").select("*").order("waktu", { ascending: false }).order("id"))
  return ok(data.map((r) => {
    const d = new Date(r.tanggal + "T00:00:00+07:00")
    return {
      id: r.id, date: fmtTglPendek(d), dateIso: r.tanggal, category: r.kategori, description: r.deskripsi,
      amount: Number(r.jumlah), status: r.status, cancelReason: r.alasan_batal || undefined, createdBy: r.dibuat_oleh,
    }
  }))
}

export async function createPengeluaran(body: B, user: Pengguna) {
  const jumlah = toInt(body.jumlah)
  if (jumlah <= 0) return gagal("Jumlah harus lebih dari 0.")
  if (!KATEGORI_PENGELUARAN.includes(body.kategori)) return gagal("Kategori tidak valid.")
  const deskripsi = String(body.deskripsi ?? "").trim()
  if (!deskripsi) return gagal("Keterangan wajib diisi.")
  if (!tanggalValid(body.tanggal)) return gagal("Tanggal tidak valid (format yyyy-MM-dd, tanggal kalender yang nyata).")
  if (body.tanggal > tanggalIso()) return gagal("Tanggal pengeluaran tidak boleh di masa depan.")
  const id = "exp-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10)
  const { error } = await db.from("pengeluaran").insert({
    id, tanggal: body.tanggal, kategori: body.kategori, deskripsi, jumlah, status: "Aktif", dibuat_oleh: oleh(user),
  })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "PENGELUARAN", `${id} ${body.kategori} Rp ${jumlah}`)
  return ok({ id })
}

export async function batalkanPengeluaran(body: B, user: Pengguna) {
  const alasan = String(body.alasan ?? "").trim()
  if (!alasan) return gagal("Alasan pembatalan wajib diisi.")
  const { data: r } = await db.from("pengeluaran").select("id,status").eq("id", body.id).maybeSingle()
  if (!r) return gagal("Pengeluaran tidak ditemukan.")
  if (r.status === "BATAL") return gagal("Sudah dibatalkan.")
  await db.from("pengeluaran").update({ status: "BATAL", alasan_batal: alasan }).eq("id", r.id)
  await tulisAudit(user.id, user.nama, "BATAL_PENGELUARAN", `${r.id} — ${alasan}`)
  return ok({ id: r.id })
}

export async function aktifkanPengeluaran(body: B, user: Pengguna) {
  const { data: r } = await db.from("pengeluaran").select("id,status").eq("id", body.id).maybeSingle()
  if (!r) return gagal("Pengeluaran tidak ditemukan.")
  if (r.status !== "BATAL") return gagal("Pengeluaran ini sudah aktif.")
  await db.from("pengeluaran").update({ status: "Aktif", alasan_batal: "" }).eq("id", r.id)
  await tulisAudit(user.id, user.nama, "AKTIFKAN_PENGELUARAN", r.id)
  return ok({ id: r.id })
}
