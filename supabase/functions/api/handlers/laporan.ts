// Padanan laporanKeuangan_, aktivitasKapster_, laporanProduk_, hitungShift_, rekapKasir_,
// tutupKasir_, listTutupKasir_ di Bisnis.js.
import {
  db, fmtJamTitik, fmtTglJam, fmtTglPanjang, gagal, ok, tanggalIso, tulisAudit, type Pengguna,
} from "../util.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const toInt = (v: unknown) => { const n = Math.round(Number(v)); return isNaN(n) ? 0 : n }
const STOK_MENIPIS = 1
const dalam = (tgl: string, b: B) => !(b.dari && tgl < b.dari) && !(b.sampai && tgl > b.sampai)

async function itemDari(ids: string[], saring?: (q: any) => any) { // deno-lint-ignore-line no-explicit-any
  const hasil: B[] = []
  for (let i = 0; i < ids.length; i += 200) {
    let q = db.from("transaksi_item").select("*").in("trx_id", ids.slice(i, i + 200))
    if (saring) q = saring(q)
    const { data } = await q
    hasil.push(...(data ?? []))
  }
  return hasil
}

export async function laporanKeuangan(body: B) {
  let qt = db.from("transaksi").select("id,tanggal,total,bayar_qris,komisi_total").eq("status", "Lunas")
  if (body.dari) qt = qt.gte("tanggal", body.dari)
  if (body.sampai) qt = qt.lte("tanggal", body.sampai)
  const [{ data: trx }, { data: peng }, { data: prod }] = await Promise.all([
    qt.limit(20000),
    db.from("pengeluaran").select("tanggal,jumlah").eq("status", "Aktif"),
    db.from("produk").select("kode,nama,stok,status"),
  ])
  let tunai = 0, qris = 0, pemasukan = 0, komisi = 0
  const perHari: Record<string, B> = {}
  for (const t of trx ?? []) {
    const total = Number(t.total) || 0, q = Math.min(Number(t.bayar_qris) || 0, total)
    pemasukan += total; qris += q; tunai += total - q; komisi += Number(t.komisi_total) || 0
    const h = (perHari[t.tanggal] ??= { tanggal: t.tanggal, total: 0, tunai: 0, qris: 0 })
    h.total += total; h.qris += q; h.tunai += total - q
  }
  let pengeluaran = 0
  for (const e of peng ?? []) if (dalam(e.tanggal, body)) pengeluaran += Number(e.jumlah) || 0

  const per: Record<string, B> = {}
  for (const i of await itemDari((trx ?? []).map((t) => t.id))) {
    const k = (per[i.kapster_id] ??= { kapsterId: i.kapster_id, kapster: i.kapster, trx: new Set(), omzet: 0, komisi: 0 })
    k.trx.add(i.trx_id); k.omzet += Number(i.harga) * Number(i.qty); k.komisi += Number(i.komisi) || 0
  }
  const perKapster = Object.values(per)
    .map((k) => ({ kapsterId: k.kapsterId, kapster: k.kapster, pelanggan: k.trx.size, omzet: k.omzet, komisi: k.komisi }))
    .sort((a, b) => b.omzet - a.omzet)
  return ok({
    pemasukan, tunai, qris, pengeluaran, komisi, sisa: pemasukan - pengeluaran - komisi,
    jumlahTransaksi: (trx ?? []).length,
    perHari: Object.keys(perHari).sort().map((k) => perHari[k]),
    perKapster,
    stokMenipis: (prod ?? []).filter((p) => p.status === "Aktif" && Number(p.stok) <= STOK_MENIPIS)
      .map((p) => ({ kode: p.kode, nama: p.nama, stok: Number(p.stok) })),
  })
}

export async function aktivitasKapster(body: B, user: Pengguna) {
  const tgl = String(body.tanggal ?? "") || tanggalIso()
  const { data: trx } = await db.from("transaksi").select("id,waktu,lembur").eq("status", "Lunas").eq("tanggal", tgl)
  const peta = new Map((trx ?? []).map((t) => [t.id, t]))
  const rows = (await itemDari([...peta.keys()], (q) => q.eq("kapster_id", user.id))).map((i) => {
    const t = peta.get(i.trx_id)!
    return {
      item: i.nama, qty: Number(i.qty), type: i.tipe, time: fmtJamTitik(new Date(t.waktu)),
      waktu: new Date(t.waktu).getTime(), fee: Number(i.harga) * Number(i.qty),
      comm: Number(i.komisi) || 0, trx: i.trx_id, lembur: t.lembur === "Ya",
    }
  })
  rows.sort((a, b) => a.waktu - b.waktu)
  return ok(rows)
}

export async function laporanProduk(body: B, user: Pengguna) {
  const kapsterSaja = user.role === "Kapster"
  let qt = db.from("transaksi").select("id,waktu,status,void_alasan,void_oleh,void_waktu")
  if (body.dari) qt = qt.gte("tanggal", body.dari)
  if (body.sampai) qt = qt.lte("tanggal", body.sampai)
  const [{ data: trx }, { data: prod }] = await Promise.all([qt.limit(20000), db.from("produk").select("*")])
  const produk = new Map((prod ?? []).map((p) => [p.kode, p]))
  const peta = new Map((trx ?? []).map((t) => [t.id, t]))
  const items = await itemDari([...peta.keys()], (q) => {
    q = q.eq("tipe", "Produk")
    return kapsterSaja ? q.eq("kapster_id", user.id) : q
  })
  const rows = items.map((i) => {
    const t = peta.get(i.trx_id)!
    const p = produk.get(i.ref_id) ?? {} as B
    const qty = Number(i.qty), harga = Number(i.harga), omzet = harga * qty
    const penjual = p.skema === "Persentase"
      ? Math.round((harga * Number(p.persen_penjual)) / 100) * qty : (Number(p.nominal_penjual) || 0) * qty
    const kapster = Number(i.komisi) || 0
    return {
      id: t.id, time: fmtTglJam(new Date(t.waktu)), waktu: new Date(t.waktu).getTime(),
      product: i.nama, qty, unitPrice: harga, totalOmzet: omzet, barber: i.kapster,
      seller: kapsterSaja ? "-" : p.penjual || "-", barberShare: kapster,
      sellerShare: kapsterSaja ? 0 : penjual, eastvilleShare: kapsterSaja ? 0 : omzet - kapster - penjual,
      status: t.status === "BATAL" ? "Batal" : "Lunas",
      voidReason: t.void_alasan || undefined, voidBy: t.void_oleh || undefined,
      voidAt: t.void_waktu ? fmtTglJam(new Date(t.void_waktu)) : undefined,
    }
  })
  rows.sort((a, b) => b.waktu - a.waktu)
  return ok(rows)
}

// ---- Tutup kasir ----
async function hitungShift(user: Pengguna) {
  const now = new Date()
  const tgl = tanggalIso(now)
  let dari = new Date(`${tgl}T00:00:00+07:00`)
  const { data: tk } = await db.from("tutup_kasir").select("waktu").eq("kasir_id", user.id).eq("tanggal", tgl)
  for (const r of tk ?? []) { const w = new Date(r.waktu); if (w > dari) dari = w }
  const h = { tanggal: tgl, dari, sampai: now, jumlahTrx: 0, penjualan: 0, diskon: 0, tunaiSistem: 0, qrisSistem: 0, gratis: 0 }
  const { data: trx } = await db.from("transaksi").select("waktu,total,bayar_qris,diskon,gratis")
    .eq("status", "Lunas").eq("dibuat_oleh_id", user.id).gt("waktu", dari.toISOString()).lte("waktu", now.toISOString())
  for (const t of trx ?? []) {
    const total = Number(t.total) || 0, qris = Number(t.bayar_qris) || 0
    h.jumlahTrx++; h.penjualan += total; h.diskon += Number(t.diskon) || 0
    h.qrisSistem += Math.min(qris, total); h.tunaiSistem += Math.max(0, total - qris)
    if (t.gratis) h.gratis++
  }
  return h
}
const bentukShift = (h: Awaited<ReturnType<typeof hitungShift>>) => ({
  tanggal: h.tanggal, dariJam: fmtJamTitik(h.dari), jumlahTrx: h.jumlahTrx, penjualan: h.penjualan,
  diskon: h.diskon, tunaiSistem: h.tunaiSistem, qrisSistem: h.qrisSistem, gratis: h.gratis,
})

export async function rekapKasir(_b: B, user: Pengguna) {
  return ok(bentukShift(await hitungShift(user)))
}

export async function tutupKasir(body: B, user: Pengguna) {
  const mentah = Number(body.uangFisik)
  if (body.uangFisik === "" || body.uangFisik === null || body.uangFisik === undefined || isNaN(mentah) || mentah < 0)
    return gagal("Isi jumlah uang tunai di laci (angka, tidak boleh negatif).")
  const fisik = toInt(mentah)
  const h = await hitungShift(user)
  if (h.jumlahTrx === 0) return gagal("Belum ada transaksi sejak tutup kasir terakhir.")
  const selisih = fisik - h.tunaiSistem
  const catatan = String(body.catatan ?? "").trim()
  if (selisih !== 0 && !catatan) return gagal("Uang di laci tidak sama dengan catatan sistem. Isi catatan penyebab selisih.")
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(h.sampai)
  const id = "TK-" + p.replace(/[-: ]/g, (c) => (c === " " ? "-" : "")) // yyMMdd-HHmmss
  const { error } = await db.from("tutup_kasir").insert({
    id, waktu: h.sampai.toISOString(), tanggal: h.tanggal, kasir_id: user.id, kasir: user.nama,
    dari_waktu: h.dari.toISOString(), jumlah_trx: h.jumlahTrx, penjualan: h.penjualan, diskon: h.diskon,
    tunai_sistem: h.tunaiSistem, qris_sistem: h.qrisSistem, uang_fisik: fisik, selisih, catatan,
  })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "TUTUP_KASIR",
    `${id} tunai sistem ${h.tunaiSistem}, fisik ${fisik}, selisih ${selisih}${catatan ? " · " + catatan : ""}`)
  return ok({ id, selisih, tunaiSistem: h.tunaiSistem, uangFisik: fisik })
}

export async function listTutupKasir(body: B, user: Pengguna) {
  let q = db.from("tutup_kasir").select("*").order("waktu", { ascending: false })
  if (user.role === "Kasir") q = q.eq("kasir_id", user.id)
  const { data } = await q
  return ok((data ?? []).filter((r) => dalam(r.tanggal, body)).map((r) => ({
    id: r.id, tanggal: fmtTglPanjang(new Date(r.waktu)), dariJam: fmtJamTitik(new Date(r.dari_waktu)),
    sampaiJam: fmtJamTitik(new Date(r.waktu)), waktu: new Date(r.waktu).getTime(), kasir: r.kasir,
    jumlahTrx: Number(r.jumlah_trx), penjualan: Number(r.penjualan), diskon: Number(r.diskon),
    tunaiSistem: Number(r.tunai_sistem), qrisSistem: Number(r.qris_sistem), uangFisik: Number(r.uang_fisik),
    selisih: Number(r.selisih), catatan: r.catatan || "",
  })))
}
