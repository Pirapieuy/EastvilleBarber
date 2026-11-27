import assert from "node:assert/strict"
import { pg, reset } from "./helper.ts"
const lap = await import("../functions/api/handlers/laporan.ts")

type Hasil = { data: Record<string, any> } // deno-lint-ignore-line no-explicit-any

async function seed() {
  await pg.exec(`insert into transaksi(id,waktu,tanggal,jam,metode,subtotal,diskon,total,komisi_total,status) values
    ('A1','2026-11-10T05:00:00Z','2026-11-10','12.00','Tunai',100000,10000,90000,36000,'Lunas'),
    ('A2','2026-11-11T05:00:00Z','2026-11-11','12.00','QRIS',50000,0,50000,25000,'Lunas'),
    ('A3','2026-11-11T06:00:00Z','2026-11-11','13.00','Tunai',70000,0,70000,0,'BATAL'),
    ('A4','2026-12-20T05:00:00Z','2026-12-20','12.00','Tunai',40000,0,40000,16000,'Lunas');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster,komisi) values
    ('A1','Layanan','1','Potong',2,40000,'u-kap1','Kapster Satu','32000'),
    ('A1','Layanan','2','Cukur',1,20000,'u-kap2','Kapster Dua','4000'),
    ('A1','Produk','P1','Pomade',1,0,'u-kap1','Kapster Satu','0'),
    ('A2','Layanan','1','Potong',1,50000,'u-kap2','Kapster Dua','25000'),
    ('A3','Layanan','1','Potong',1,70000,'u-kap1','Kapster Satu','0'),
    ('A4','Layanan','1','Potong',1,40000,'u-kap1','Kapster Satu','16000');`)
}

Deno.test("laporan-layanan: per layanan dan kapster, hanya Lunas dalam rentang, produk tidak ikut", async () => {
  await reset(); await seed()
  const r = await lap.laporanLayanan({ dari: "2026-11-01", sampai: "2026-11-30" }) as Hasil
  assert.equal(r.data.jumlahTransaksi, 2)
  assert.equal(r.data.totalJumlah, 4)
  assert.equal(r.data.totalOmzet, 150000)
  assert.equal(r.data.totalKomisi, 61000)
  const potong = r.data.layanan.find((l: any) => l.nama === "Potong") // deno-lint-ignore-line no-explicit-any
  assert.deepEqual([potong.jumlah, potong.omzet, potong.komisi], [3, 130000, 57000])
  assert.equal(potong.kapster.length, 2)
  assert.equal(r.data.layanan[0].nama, "Potong", "urut omzet terbesar dulu")
  assert.equal(r.data.layanan.some((l: any) => l.nama === "Pomade"), false) // deno-lint-ignore-line no-explicit-any
  const k1 = r.data.perKapster.find((k: any) => k.kapsterId === "u-kap1") // deno-lint-ignore-line no-explicit-any
  assert.deepEqual([k1.jumlah, k1.omzet, k1.komisi], [2, 80000, 32000])
})

Deno.test("laporan-layanan: tanpa transaksi mengembalikan daftar kosong", async () => {
  await reset()
  const r = await lap.laporanLayanan({ dari: "2026-11-01", sampai: "2026-11-30" }) as Hasil
  assert.deepEqual([r.data.jumlahTransaksi, r.data.totalOmzet, r.data.layanan.length], [0, 0, 0])
})

Deno.test("laporan-keuangan: diskon dijumlahkan hanya dari transaksi Lunas", async () => {
  await reset(); await seed()
  const r = await lap.laporanKeuangan({ dari: "2026-11-01", sampai: "2026-11-30" }) as Hasil
  assert.equal(r.data.diskon, 10000)
  assert.equal(r.data.pemasukan, 140000)
})
