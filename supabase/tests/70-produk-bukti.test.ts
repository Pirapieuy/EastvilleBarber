// Bukti bug area Produk (frontend mengirim persis seperti ProductsPage.tsx).
import assert from "node:assert/strict"
import { pg, reset } from "./helper.ts"
const prd = await import("../functions/api/handlers/produk.ts")
const kat = await import("../functions/api/handlers/katalog.ts")
const trx = await import("../functions/api/handlers/transaksi.ts")
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const form = (o: Record<string, unknown> = {}) => ({ kode: "P1", nama: "Pomade", penjual: "Eastville", stok: 10, skema: "Persentase", status: "Aktif",
  harga: 50000, hargaModal: 30000, shares: { barber: 10, seller: 0, eastville: 90 }, nominalShares: { barber: 0, seller: 0, eastville: 0 }, ...o })
const q = async (s: string) => (await pg.query<Record<string, unknown>>(s)).rows

Deno.test("P1 simpan produk baru dengan stok awal -> stok tersimpan", async () => {
  await reset()
  const r = await prd.simpanProduk({ produk: form(), alasan: "", baru: true }, owner) as { success: boolean; error?: string }
  assert.equal(r.success, true, r.error)
  assert.equal((await q(`select stok from produk`))[0].stok, 10)
})

Deno.test("P2 EDIT produk: stok pada form TIDAK boleh menimpa stok asli (stok berubah hanya lewat restok/penjualan)", async () => {
  await reset(); await prd.simpanProduk({ produk: form(), alasan: "", baru: true }, owner)
  await pg.exec(`update produk set stok = 4`) // 6 terjual
  const r = await prd.simpanProduk({ produk: form({ stok: 10, harga: 55000, shares: { barber: 10, seller: 0, eastville: 90 } }), alasan: "naik harga", baru: false }, owner) as { success: boolean; error?: string }
  assert.equal(r.success, true, r.error)
  assert.equal((await q(`select stok from produk`))[0].stok, 4, "stok asli tetap 4")
})

Deno.test("P3 nonaktifkan produk dari form (edit status) tersimpan", async () => {
  await reset(); await prd.simpanProduk({ produk: form(), alasan: "", baru: true }, owner)
  const r = await prd.simpanProduk({ produk: form({ status: "Nonaktif" }), alasan: "tidak dijual", baru: false }, owner) as { success: boolean; error?: string }
  assert.equal(r.success, true, r.error)
  assert.equal((await q(`select status from produk`))[0].status, "Nonaktif")
})

Deno.test("P4 restok produk Nonaktif karena habis -> kembali Aktif otomatis; restok produk yang sengaja dinonaktifkan -> tetap Nonaktif", async () => {
  await reset(); await prd.simpanProduk({ produk: form({ stok: 0 }), alasan: "", baru: true }, owner)
  await pg.exec(`update produk set status='Nonaktif'`)
  await prd.adjustStok({ kode: "P1", delta: 5, alasan: "Restok" }, owner)
  assert.equal((await q(`select status from produk`))[0].status, "Aktif")
  await prd.simpanProduk({ produk: form({ status: "Nonaktif", stok: 5 }), alasan: "stop jual", baru: false }, owner)
  await prd.adjustStok({ kode: "P1", delta: 5, alasan: "Restok" }, owner)
  assert.equal((await q(`select status from produk`))[0].status, "Nonaktif", "dinonaktifkan sengaja oleh owner harus tetap")
})

Deno.test("P5 produk stok habis lalu otomatis Nonaktif tidak boleh bisa dikembalikan Aktif dari form selama stok 0", async () => {
  await reset(); await prd.simpanProduk({ produk: form({ stok: 0, status: "Aktif" }), alasan: "", baru: true }, owner)
  assert.equal((await q(`select status from produk`))[0].status, "Nonaktif", "produk baru stok 0 tidak boleh Aktif")
})

Deno.test("P6 urutan daftar produk stabil: list-produk sama urutannya setiap kali dan produk baru di akhir", async () => {
  await reset()
  for (const k of ["C", "A", "B"]) await prd.simpanProduk({ produk: form({ kode: k, nama: "Prod " + k }), alasan: "", baru: true }, owner)
  const r = await kat.listProduk() as { data: { kode: string }[] }
  assert.deepEqual(r.data.map((x) => x.kode), ["C", "A", "B"])
})

Deno.test("P7 harga/angka pecahan/negatif/teks ditolak server", async () => {
  await reset()
  for (const bad of [{ harga: -1 }, { harga: 0 }, { harga: "abc" }, { hargaModal: -5 }, { stok: -3 }, { stok: 1.5 }, { harga: 1e12 }]) {
    const r = await prd.simpanProduk({ produk: form(bad), alasan: "", baru: true }, owner) as { success: boolean }
    assert.equal(r.success, false, JSON.stringify(bad) + " harus ditolak")
  }
})

Deno.test("P8 kode produk: spasi/huruf besar kecil/karakter aneh dinormalkan, duplikat beda huruf ditolak", async () => {
  await reset()
  await prd.simpanProduk({ produk: form({ kode: " p1 " }), alasan: "", baru: true }, owner)
  const dup = await prd.simpanProduk({ produk: form({ kode: "P1" }), alasan: "", baru: true }, owner) as { success: boolean }
  assert.equal(dup.success, false)
  assert.equal((await q(`select kode from produk`))[0].kode, "p1")
})

Deno.test("P9 hapus produk yang sudah terjual: riwayat transaksi tetap utuh", async () => {
  await reset(); await prd.simpanProduk({ produk: form(), alasan: "", baru: true }, owner)
  await pg.exec(`insert into transaksi(id,tanggal,jam,metode,subtotal,total,status) values ('X1','2026-11-01','10.00','Tunai',50000,50000,'Lunas');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster) values ('X1','Produk','P1','Pomade',1,50000,'u-kap1','K')`)
  const r = await prd.hapusProduk({ kode: "P1", alasan: "salah input" }, owner) as { success: boolean }
  assert.equal(r.success, true)
  assert.equal((await q(`select count(*)::int n from transaksi_item`))[0].n, 1)
  const lst = await trx.listTransaksi({}, owner) as { data: { items: unknown[] }[] }
  assert.equal(lst.data[0].items.length, 1)
})

Deno.test("P10 restok: jumlah pecahan/nol/negatif/teks ditolak; restok besar wajar diterima", async () => {
  await reset(); await prd.simpanProduk({ produk: form(), alasan: "", baru: true }, owner)
  for (const d of [0, -1, 1.5, "abc", 1e9]) {
    const r = await prd.adjustStok({ kode: "P1", delta: d, alasan: "x" }, owner) as { success: boolean }
    if (d === -1) continue // koreksi kurang sah selama stok cukup
    assert.equal(r.success, false, String(d) + " harus ditolak")
  }
  assert.equal(((await prd.adjustStok({ kode: "P1", delta: 50, alasan: "Restok" }, owner)) as { success: boolean }).success, true)
})

Deno.test("P11 dua restok bersamaan: keduanya terhitung (tidak saling menimpa)", async () => {
  await reset(); await prd.simpanProduk({ produk: form({ stok: 0 }), alasan: "", baru: true }, owner)
  await Promise.all([1, 2, 3, 4, 5].map(() => prd.adjustStok({ kode: "P1", delta: 2, alasan: "Restok" }, owner)))
  assert.equal((await q(`select stok from produk`))[0].stok, 10)
})
