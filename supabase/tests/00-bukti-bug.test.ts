// Bukti bug (merah sebelum perbaikan). Tiap test = satu gejala nyata.
import assert from "node:assert/strict"
import { pg, reset, seedTransaksi, T } from "./helper.ts"
const sdm = await import("../functions/api/handlers/sdm.ts")
const lap = await import("../functions/api/handlers/laporan.ts")
const trx = await import("../functions/api/handlers/transaksi.ts")
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never

Deno.test("B1 hitung-gaji: 1200 transaksi harus terhitung semua (batas 1000 baris PostgREST)", async () => {
  await reset(); await seedTransaksi(1200)
  const r = await sdm.hitungGaji({ token: T.owner, userId: "u-kap1" }) as { data: { totalKomisi: number } }
  assert.equal(r.data.totalKomisi, 1_200_000)
})

Deno.test("B2 laporan-keuangan: 1200 transaksi harus terhitung semua", async () => {
  await reset(); await seedTransaksi(1200)
  const r = await lap.laporanKeuangan({ dari: "2026-11-01", sampai: "2026-11-30" }) as { data: { jumlahTransaksi: number; pemasukan: number } }
  assert.equal(r.data.jumlahTransaksi, 1200)
  assert.equal(r.data.pemasukan, 3_000_000)
})

Deno.test("B3 update-transaksi gagal validasi tidak boleh mengubah stok", async () => {
  await reset()
  await pg.exec(`insert into produk(kode,nama,stok,harga,skema,persen_kapster) values ('P1','Pomade',5,50000,'Persentase',10);
    insert into transaksi(id,tanggal,jam,metode,subtotal,total,status,dibuat_oleh_id) values ('X1',to_char(now() at time zone 'Asia/Jakarta','YYYY-MM-DD'),'10.00','Tunai',100000,100000,'Lunas','u-kasir');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster) values ('X1','Produk','P1','Pomade',2,50000,'u-kap1','Kapster Satu');`)
  const r = await trx.updateTransaksi({ id: "X1", items: [
    { tipe: "Produk", refId: "P1", qty: 1, kapsterId: "u-kap1" }, { tipe: "Layanan", refId: "999", qty: 1, kapsterId: "u-kap1" }] }, owner) as { success: boolean }
  assert.equal(r.success, false)
  const s = await pg.query<{ stok: number }>(`select stok from produk where kode='P1'`)
  assert.equal(s.rows[0].stok, 5, "stok harus tetap 5 (belum ada perubahan)")
})

Deno.test("B4 update-transaksi yang menjual stok terakhir tetap bisa diedit", async () => {
  await reset()
  await pg.exec(`insert into layanan(nama,harga) values ('Potong',50000);
    insert into produk(kode,nama,stok,harga,skema,persen_kapster,status) values ('P1','Pomade',0,50000,'Persentase',10,'Nonaktif');
    insert into transaksi(id,tanggal,jam,metode,subtotal,total,status,dibuat_oleh_id) values ('X1',to_char(now() at time zone 'Asia/Jakarta','YYYY-MM-DD'),'10.00','Tunai',50000,50000,'Lunas','u-kasir');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster) values ('X1','Produk','P1','Pomade',1,50000,'u-kap1','Kapster Satu');`)
  const r = await trx.updateTransaksi({ id: "X1", items: [{ tipe: "Produk", refId: "P1", qty: 1, kapsterId: "u-kap1" }] }, owner) as { success: boolean; error?: string }
  assert.equal(r.success, true, r.error)
})

Deno.test("B5 lunasi-kasbon hanya untuk kasbon Aktif", async () => {
  await reset()
  await pg.exec(`insert into kasbon(id,tanggal,user_id,nama,role,jumlah,status) values ('k1','2026-11-01','u-kap1','K','Kapster',1000,'Menunggu'),('k2','2026-11-01','u-kap1','K','Kapster',1000,'Ditolak');`)
  for (const id of ["k1", "k2"]) {
    const r = await sdm.lunasiKasbon({ token: T.owner, id }) as { success: boolean }
    assert.equal(r.success, false, id + " tidak boleh dilunasi")
  }
})

Deno.test("B6 bayar-gaji ganda bersamaan hanya boleh sekali", async () => {
  await reset(); await seedTransaksi(3)
  const p = { token: T.owner, userId: "u-kap1", nama: "Kapster Satu", role: "Kapster", periode: "2026-11" }
  const hasil = await Promise.all([sdm.bayarGaji(p), sdm.bayarGaji(p)]) as { success: boolean }[]
  assert.equal(hasil.filter((h) => h.success).length, 1)
  const g = await pg.query<{ n: number }>(`select count(*)::int n from gaji`)
  assert.equal(g.rows[0].n, 1)
})

Deno.test("B7 komisi transaksi manual bertanggal mundur tetap terbayar di gaji berikutnya", async () => {
  await reset(); await seedTransaksi(2)
  const p = { token: T.owner, userId: "u-kap1", nama: "Kapster Satu", role: "Kapster", periode: "2026-11" }
  assert.equal(((await sdm.bayarGaji(p)) as { success: boolean }).success, true)
  await seedTransaksi(1, "u-kap1", 100, "2026-11-02") // input manual untuk tanggal sebelum pembayaran
  const r = await sdm.hitungGaji({ token: T.owner, userId: "u-kap1" }) as { data: { totalKomisi: number } }
  assert.equal(r.data.totalKomisi, 1000)
})

Deno.test("B8 tanggal tak nyata (2026-02-31) ditolak, daftar pengeluaran tidak rusak", async () => {
  await reset()
  const r = await trx.createPengeluaran({ jumlah: 1000, kategori: "Listrik", deskripsi: "x", tanggal: "2026-02-31" }, owner) as { success: boolean }
  assert.equal(r.success, false)
  await trx.listPengeluaran()
})

Deno.test("B9 kasir tidak boleh melihat gaji orang lain", async () => {
  await reset(); await seedTransaksi(1)
  await pg.exec(`insert into gaji(id,periode,user_id,nama,role,status) values ('g1','2026-11','u-kap1','K','Kapster','Dibayar')`)
  const a = await sdm.listGaji({ token: T.kasir }).catch((e: Error) => ({ success: false, e })) as { success: boolean }
  const b = await sdm.hitungGaji({ token: T.kasir, userId: "u-kap1" }).catch((e: Error) => ({ success: false, e })) as { success: boolean }
  assert.equal(a.success, false); assert.equal(b.success, false)
})
