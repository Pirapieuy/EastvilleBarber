// Pilihan komisi layanan dari Kasir ("Normal"/"OT") harus sama dengan yang tertera di tombolnya: 40% / 50%.
import assert from "node:assert/strict"
import { pg, reset } from "./helper.ts"
const trx = await import("../functions/api/handlers/transaksi.ts")
const kasir = { id: "u-kasir", nama: "Kasir", role: "Kasir" } as never
const hari = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
async function dasar(komisiDefault: number, komisiLembur: number, jamMulai = "0000", jamSelesai = "2359") {
  await reset()
  await pg.exec(`update pengaturan set value='${jamMulai}' where key='jam_mulai'; update pengaturan set value='${jamSelesai}' where key='jam_selesai';
    update pengaturan set value='${komisiDefault}' where key='komisi_default'; update pengaturan set value='${komisiLembur}' where key='komisi_lembur';
    insert into layanan(nama,harga) values ('Potong',100000);
    insert into absensi(id,tanggal,user_id,nama,role,status) values ('a1','${hari()}','u-kap1','K','Kapster','Hadir')`)
}
const komisi = async (pilihan?: string) => {
  const r = await trx.createTransaksi({ items: [{ tipe: "Layanan", refId: "1", qty: 1, kapsterId: "u-kap1" }], metode: "Tunai", bayarTunai: 100000,
    ...(pilihan ? { komisiLayanan: pilihan } : {}) }, kasir) as { success: boolean; error?: string }
  assert.equal(r.success, true, r.error)
  return Number((await pg.query<{ k: number }>(`select komisi k from transaksi_item order by id desc limit 1`)).rows[0].k)
}
Deno.test("Normal = 40% dan OT = 50% walau pengaturan Owner berbeda (sama dengan tombol di Kasir)", async () => {
  await dasar(35, 60)
  assert.equal(await komisi("Normal"), 40000)
  assert.equal(await komisi("OT"), 50000)
})
Deno.test("tanpa pilihan: otomatis mengikuti jam kerja + pengaturan Owner (tidak berubah)", async () => {
  await dasar(35, 60)
  assert.equal(await komisi(), 35000)
  await dasar(35, 60, "0000", "0001") // sekarang di luar jam kerja -> lembur
  assert.equal(await komisi(), 60000)
})
Deno.test("komisi pribadi kapster tetap dipakai bila tanpa pilihan", async () => {
  await dasar(40, 50)
  await pg.exec(`insert into komisi_kapster(user_id,persen) values ('u-kap1',45)`)
  assert.equal(await komisi(), 45000)
})
