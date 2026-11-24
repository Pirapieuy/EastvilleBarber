// Jalur normal setelah penulisan ulang: harus tetap benar.
import assert from "node:assert/strict"
import { pg, reset, T } from "./helper.ts"
const trx = await import("../functions/api/handlers/transaksi.ts")
const sdm = await import("../functions/api/handlers/sdm.ts")
const bak = await import("../functions/api/handlers/backup.ts")
const kasir = { id: "u-kasir", nama: "Kasir", role: "Kasir" } as never
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
const stok = async (k = "P1") => (await pg.query<{ stok: number }>(`select stok from produk where kode='${k}'`)).rows[0].stok

async function dasar() {
  await reset()
  await pg.exec(`update pengaturan set value='0000' where key='jam_mulai'; update pengaturan set value='2359' where key='jam_selesai'`) // sepanjang hari = bukan lembur
  await pg.exec(`insert into layanan(nama,harga) values ('Potong',50000);
    insert into produk(kode,nama,stok,harga,skema,persen_kapster) values ('P1','Pomade',10,40000,'Persentase',10);
    insert into absensi(id,tanggal,user_id,nama,role,status) values ('a1','${hariIni()}','u-kap1','K','Kapster','Hadir'),('a2','${hariIni()}','u-kap2','K','Kapster','Hadir');`)
}
const bayar = (items: unknown[], extra = {}) => trx.createTransaksi({ items, metode: "Tunai", bayarTunai: 1_000_000, ...extra }, kasir) as Promise<{ success: boolean; error?: string; data?: { id: string; total: number } }>

Deno.test("createTransaksi: stok berkurang, komisi benar, id urut", async () => {
  await dasar()
  const r = await bayar([{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }, { tipe: "Produk", refId: "P1", qty: 3, kapsterId: "u-kap1" }])
  assert.equal(r.success, true, r.error)
  assert.equal(await stok(), 7)
  const k = await pg.query<{ komisi_total: number }>(`select komisi_total from transaksi where id='${r.data!.id}'`)
  assert.ok(k.rows[0].komisi_total > 0)
  const r2 = await bayar([{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }])
  assert.match(r2.data!.id, /-0002$/)
})

Deno.test("createTransaksi: clientRequestId sama dua kali = satu transaksi (tahan restart)", async () => {
  await dasar()
  const it = [{ tipe: "Produk", refId: "P1", qty: 2, kapsterId: "u-kap1" }]
  const [a, b] = await Promise.all([bayar(it, { clientRequestId: "abc" }), bayar(it, { clientRequestId: "abc" })])
  assert.equal(a.data!.id, b.data!.id)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from transaksi`)).rows[0].n, 1)
  assert.equal(await stok(), 8, "stok hanya berkurang sekali")
})

Deno.test("createTransaksi: stok tidak cukup ditolak, dan balapan stok terakhir tidak membuat stok negatif", async () => {
  await dasar()
  await pg.exec(`update produk set stok = 1 where kode='P1'`)
  const it = [{ tipe: "Produk", refId: "P1", qty: 1, kapsterId: "u-kap1" }]
  const hasil = await Promise.all([bayar(it), bayar(it)])
  assert.equal(hasil.filter((h) => h.success).length, 1)
  assert.equal(await stok(), 0)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from transaksi`)).rows[0].n, 1, "transaksi yang gagal tidak boleh tersisa")
})

Deno.test("updateTransaksi: ubah qty produk menghitung selisih stok dengan benar", async () => {
  await dasar()
  const r = await bayar([{ tipe: "Produk", refId: "P1", qty: 3, kapsterId: "u-kap1" }])
  assert.equal(await stok(), 7)
  const e = await trx.updateTransaksi({ id: r.data!.id, items: [{ tipe: "Produk", refId: "P1", qty: 5, kapsterId: "u-kap1" }] }, kasir) as { success: boolean; error?: string }
  assert.equal(e.success, true, e.error)
  assert.equal(await stok(), 5)
  const e2 = await trx.updateTransaksi({ id: r.data!.id, items: [{ tipe: "Produk", refId: "P1", qty: 1, kapsterId: "u-kap1" }] }, kasir) as { success: boolean }
  assert.equal(e2.success, true)
  assert.equal(await stok(), 9)
  const e3 = await trx.updateTransaksi({ id: r.data!.id, items: [{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }] }, kasir) as { success: boolean }
  assert.equal(e3.success, true)
  assert.equal(await stok(), 10, "produk dibuang dari transaksi = stok kembali penuh")
})

Deno.test("updateTransaksi: item yang komisinya sudah digaji ditolak dan stok tidak berubah", async () => {
  await dasar()
  const r = await bayar([{ tipe: "Produk", refId: "P1", qty: 2, kapsterId: "u-kap1" }])
  await sdm.bayarGaji({ token: T.owner, userId: "u-kap1", nama: "x", role: "Kapster" })
  const e = await trx.updateTransaksi({ id: r.data!.id, items: [{ tipe: "Produk", refId: "P1", qty: 1, kapsterId: "u-kap1" }] }, owner) as { success: boolean }
  assert.equal(e.success, false)
  assert.equal(await stok(), 8)
})

Deno.test("batal & pulihkan: stok kembali/terpotong sekali, klik ganda aman", async () => {
  await dasar()
  const r = await bayar([{ tipe: "Produk", refId: "P1", qty: 4, kapsterId: "u-kap1" }])
  const [b1, b2] = await Promise.all([
    trx.batalkanTransaksi({ id: r.data!.id, alasan: "salah" }, kasir), trx.batalkanTransaksi({ id: r.data!.id, alasan: "salah" }, kasir)]) as { success: boolean }[]
  assert.equal([b1, b2].filter((x) => x.success).length, 1)
  assert.equal(await stok(), 10)
  const p = await trx.pulihkanTransaksi({ id: r.data!.id, alasan: "keliru" }, owner) as { success: boolean }
  assert.equal(p.success, true); assert.equal(await stok(), 6)
})

Deno.test("gaji: komisi dibayar sekali, transaksi baru masuk gaji berikutnya, batal tidak dobel", async () => {
  await dasar()
  await bayar([{ tipe: "Layanan", refId: "1", qty: 2, kapsterId: "u-kap1" }])
  const h1 = await sdm.hitungGaji({ token: T.owner, userId: "u-kap1" }) as { data: { totalKomisi: number } }
  assert.equal(h1.data.totalKomisi, 40000)
  const p1 = await sdm.bayarGaji({ token: T.owner, userId: "u-kap1", nama: "salah-nama", role: "Owner" }) as { success: boolean }
  assert.equal(p1.success, true)
  assert.equal((await pg.query<{ nama: string; role: string }>(`select nama,role from gaji`)).rows[0].nama, "Kapster Satu", "nama dari database, bukan dari browser")
  const p2 = await sdm.bayarGaji({ token: T.owner, userId: "u-kap1" }) as { success: boolean }
  assert.equal(p2.success, false, "tidak ada komisi baru")
  await bayar([{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }])
  const h2 = await sdm.hitungGaji({ token: T.owner, userId: "u-kap1" }) as { data: { totalKomisi: number } }
  assert.equal(h2.data.totalKomisi, 20000)
})

Deno.test("gaji: kasbon wajib dipilih bila muat, tidak boleh melebihi komisi", async () => {
  await dasar()
  await bayar([{ tipe: "Layanan", refId: "1", qty: 2, kapsterId: "u-kap1" }]) // komisi 40000
  await pg.exec(`insert into kasbon(id,tanggal,user_id,nama,role,jumlah,status) values ('k1','2026-11-01','u-kap1','K','Kapster',30000,'Aktif'),('k2','2026-11-02','u-kap1','K','Kapster',50000,'Aktif')`)
  assert.equal(((await sdm.bayarGaji({ token: T.owner, userId: "u-kap1", kasbonIds: [] })) as { success: boolean }).success, false)
  assert.equal(((await sdm.bayarGaji({ token: T.owner, userId: "u-kap1", kasbonIds: ["k1", "k2"] })) as { success: boolean }).success, false)
  const ok = await sdm.bayarGaji({ token: T.owner, userId: "u-kap1", kasbonIds: ["k1"] }) as { success: boolean; data: { gajiBersih: number } }
  assert.equal(ok.data.gajiBersih, 10000)
  const s = await pg.query<{ id: string; status: string }>(`select id,status from kasbon order by id`)
  assert.deepEqual(s.rows.map((r) => r.status), ["Lunas", "Aktif"])
})

Deno.test("backup: buat → ubah data → pulihkan mengembalikan kasbon, gaji, absensi, transaksi", async () => {
  await dasar()
  await bayar([{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }])
  await pg.exec(`insert into kasbon(id,tanggal,user_id,nama,role,jumlah,status) values ('k1','2026-11-01','u-kap1','K','Kapster',1000,'Aktif')`)
  const b = await bak.backupBuat({}, owner) as { success: boolean; data: { nama: string }; error?: string }
  assert.equal(b.success, true, b.error)
  await pg.exec(`delete from kasbon; delete from transaksi_item; delete from transaksi;`)
  await new Promise((r) => setTimeout(r, 0))
  await pg.exec(`delete from backup where nama <> '${b.data.nama}'`)
  // pengaman memakai stempel menit yang sama -> geser nama backup asli ke menit lalu
  await pg.exec(`update backup set nama='BAK_20200101_0000' where nama='${b.data.nama}'`)
  const p = await bak.backupPulihkan({ nama: "BAK_20200101_0000" }, owner) as { success: boolean; error?: string }
  assert.equal(p.success, true, p.error)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from kasbon`)).rows[0].n, 1)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from transaksi_item`)).rows[0].n, 1)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from users`)).rows[0].n, 5, "akun tidak tersentuh")
})

Deno.test("backup: snapshot lama tanpa tabel SDM tidak menghapus kasbon/gaji/absensi", async () => {
  await dasar()
  await pg.exec(`insert into kasbon(id,tanggal,user_id,nama,role,jumlah,status) values ('k1','2026-11-01','u-kap1','K','Kapster',1000,'Aktif');
    insert into backup(nama,sheet,baris,data) values ('BAK_20200101_0000',1,0,'{"layanan":[]}'::jsonb)`)
  const p = await bak.backupPulihkan({ nama: "BAK_20200101_0000" }, owner) as { success: boolean; error?: string }
  assert.equal(p.success, true, p.error)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from kasbon`)).rows[0].n, 1)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from absensi`)).rows[0].n, 2)
})
