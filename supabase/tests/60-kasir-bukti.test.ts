// Bukti bug area Kasir/Kapster (merah sebelum perbaikan).
import assert from "node:assert/strict"
import { pg, reset, T } from "./helper.ts"
const trx = await import("../functions/api/handlers/transaksi.ts")
const dsk = await import("../functions/api/handlers/diskon.ts")
const lap = await import("../functions/api/handlers/laporan.ts")
const sdm = await import("../functions/api/handlers/sdm.ts")
const kasir = { id: "u-kasir", nama: "Kasir", role: "Kasir" } as never
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
async function dasar() {
  await reset()
  await pg.exec(`update pengaturan set value='0000' where key='jam_mulai'; update pengaturan set value='2359' where key='jam_selesai';
    insert into layanan(nama,harga) values ('Potong',50000);
    insert into absensi(id,tanggal,user_id,nama,role,status) values ('a1','${hariIni()}','u-kap1','K','Kapster','Hadir');`)
}
const bayar = (extra: object) => trx.createTransaksi({ items: [{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }], metode: "Tunai", bayarTunai: 100000, ...extra }, kasir) as Promise<{ success: boolean; error?: string; data?: { id: string } }>

Deno.test("K1 kode diskon pemakaian tercatat akurat saat 2 transaksi bersamaan", async () => {
  await dasar()
  await pg.exec(`insert into kode_diskon(id,kode,nama,persen,berlaku_sampai,jenis,nilai) values ('kd1','HEMAT10','x',10,'2999-01-01','persen',10)`)
  await Promise.all([bayar({ kodeDiskon: "HEMAT10" }), bayar({ kodeDiskon: "HEMAT10" }), bayar({ kodeDiskon: "HEMAT10" })])
  assert.equal((await pg.query<{ d: number }>(`select dipakai d from kode_diskon`)).rows[0].d, 3)
})

Deno.test("K2 transaksi manual: nomor nota ganda bersamaan hanya satu yang masuk", async () => {
  await dasar()
  const man = () => trx.createTransaksiManual({ items: [{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }], metode: "Tunai", bayarTunai: 100000,
    tanggal: "2026-11-01", jam: "10:00", nomorNota: "NB-001" }, kasir) as Promise<{ success: boolean }>
  const h = await Promise.all([man(), man()])
  assert.equal(h.filter((x) => x.success).length, 1)
})

Deno.test("K3 tutup-kasir ganda bersamaan hanya satu yang tercatat", async () => {
  await dasar(); await bayar({})
  const t = () => lap.tutupKasir({ uangFisik: 50000 }, kasir) as Promise<{ success: boolean }>
  const h = await Promise.all([t(), t()])
  assert.equal(h.filter((x) => x.success).length, 1)
})

Deno.test("K4 transaksi Gabungan: tunai+qris harus pas total, tidak boleh QRIS 0 diam-diam salah catat", async () => {
  await dasar()
  const r = await bayar({ metode: "Gabungan", bayarTunai: 20000, bayarQris: 30000 })
  assert.equal(r.success, true)
  const t = await pg.query<{ t: number; q: number }>(`select bayar_tunai t, bayar_qris q from transaksi`)
  assert.deepEqual([Number(t.rows[0].t), Number(t.rows[0].q)], [20000, 30000])
})

Deno.test("K5 pilihan komisi kasir mengikuti tombol (OT 50%), bukan pengaturan Owner; detailnya di 95-komisi-pilihan.test.ts", async () => {
  await dasar()
  await pg.exec(`update pengaturan set value='35' where key='komisi_default'; update pengaturan set value='60' where key='komisi_lembur'`)
  const r = await bayar({ komisiLayanan: "OT" })
  const k = await pg.query<{ komisi: number }>(`select komisi from transaksi_item`)
  assert.equal(r.success, true); assert.equal(Number(k.rows[0].komisi), 25000, "OT = 50% dari Rp50.000")
})

Deno.test("K6 kapster nonaktif/dihapus tidak boleh dipakai di transaksi baru", async () => {
  await dasar(); await pg.exec(`update users set status='Dihapus' where id='u-kap1'`)
  const r = await bayar({})
  assert.equal(r.success, false)
})

Deno.test("K7 absensi kapster: absen Masuk dua kali di hari yang sama tidak boleh dobel", async () => {
  await reset()
  const a = await sdm.catatAbsensi({ token: T.kapster, tipe: "Masuk" }) as { success: boolean }
  const b = await sdm.catatAbsensi({ token: T.kapster, tipe: "Masuk" }) as { success: boolean }
  assert.equal(a.success, true); assert.equal(b.success, false)
})

Deno.test("K8 kasbon: Kapster tidak boleh mengajukan jumlah di atas batas wajar (angka raksasa/desimal)", async () => {
  await reset()
  const r = await sdm.createKasbon({ token: T.kapster, jumlah: 1e15 }) as { success: boolean }
  assert.equal(r.success, false)
  const s = await sdm.createKasbon({ token: T.kapster, jumlah: "1000abc" }) as { success: boolean }
  assert.equal(s.success, false)
})

Deno.test("K9 kasbon tanggal tak valid ditolak", async () => {
  await reset()
  const r = await sdm.createKasbon({ token: T.owner, userId: "u-kap1", jumlah: 1000, tanggal: "2026-13-45" }) as { success: boolean }
  assert.equal(r.success, false)
})

Deno.test("K10 owner tidak boleh membuat kasbon untuk Owner/akun tak ada", async () => {
  await reset()
  const r = await sdm.createKasbon({ token: T.owner, userId: "tidak-ada", nama: "Hantu", role: "Kapster", jumlah: 1000 }) as { success: boolean }
  assert.equal(r.success, false)
})

Deno.test("K11 pin otorisasi: kasir terkunci tidak boleh lolos di percobaan ke-6 walau PIN benar", async () => {
  await dasar()
  await pg.exec(`insert into login_gagal(username,jumlah,terakhir) values ('pinotor_u-kasir',5,now())`)
  const r = await dsk.verifikasiPinOtorisasi({ pin: "123456" }, kasir) as { success: boolean }
  assert.equal(r.success, false)
})

Deno.test("K7b laporan kendala boleh setelah absen, dan tidak menghalangi absen normal", async () => {
  await reset()
  const k = await sdm.catatAbsensi({ token: T.kapster, tipe: "Masuk", catatan: "Kendala: HP mati" }) as { success: boolean }
  const a = await sdm.catatAbsensi({ token: T.kapster, tipe: "Masuk" }) as { success: boolean }
  const k2 = await sdm.catatAbsensi({ token: T.kapster, tipe: "Masuk", catatan: "Kendala: lagi" }) as { success: boolean }
  assert.deepEqual([k.success, a.success, k2.success], [true, true, true])
})
