import assert from "node:assert/strict"
import { pg, reset, seedTransaksi } from "./helper.ts"
Deno.test("migrasi: komisi sebelum gaji terakhir ditandai lunas, sesudahnya tetap belum", async () => {
  await reset(); await seedTransaksi(2, "u-kap1", 1, "2026-11-05"); await seedTransaksi(3, "u-kap1", 10, "2026-11-20")
  await pg.exec(`insert into gaji(id,periode,user_id,nama,role,status,tanggal_bayar) values ('g1','2026-11','u-kap1','K','Kapster','Dibayar','2026-11-10T00:00:00Z')`)
  await pg.query(`select tandai_komisi_lama()`)
  const r = await pg.query<{ lunas: number; belum: number }>(`select count(*) filter (where gaji_id is not null)::int lunas, count(*) filter (where gaji_id is null)::int belum from transaksi_item`)
  assert.deepEqual(r.rows[0], { lunas: 2, belum: 3 })
})
