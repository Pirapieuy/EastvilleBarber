import assert from "node:assert/strict"
import { pg, reset, T } from "./helper.ts"
const sdm = await import("../functions/api/handlers/sdm.ts")
const usr = await import("../functions/api/handlers/user.ts")
const trx = await import("../functions/api/handlers/transaksi.ts")
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never

Deno.test("koreksi absensi: status ngawur ditolak", async () => {
  await reset()
  await pg.exec(`insert into absensi(id,tanggal,user_id,nama,role,status) values ('a1','2026-11-01','u-kap1','K','Kapster','Hadir')`)
  assert.equal(((await sdm.koreksiAbsensi({ token: T.owner, id: "a1", status: "Libur Bebas" })) as { success: boolean }).success, false)
  assert.equal(((await sdm.koreksiAbsensi({ token: T.owner, id: "a1", status: "Sakit" })) as { success: boolean }).success, true)
})

Deno.test("owner tidak bisa mengunci diri: turun peran / nonaktifkan Owner terakhir", async () => {
  await reset()
  await pg.exec(`update users set status='Nonaktif' where id='u-owner2'`)
  const u = (id: string, role: string) => ({ token: T.owner, id, nama: "x", username: id, role, email: id + "@x.id" })
  assert.equal(((await usr.updateUser(u("u-owner", "Kasir"))) as { success: boolean }).success, false)
  assert.equal(((await usr.toggleUserStatus({ token: T.owner, id: "u-owner2", status: "Nonaktif" })) as { success: boolean }).success, true, "yang sudah nonaktif tidak masalah")
})

Deno.test("owner kedua boleh dinonaktifkan selama masih ada owner lain; sesi ikut mati", async () => {
  await reset()
  const r = await usr.toggleUserStatus({ token: T.owner, id: "u-owner2", status: "Nonaktif" }) as { success: boolean }
  assert.equal(r.success, true)
  assert.equal((await pg.query<{ status: string }>(`select status from sessions where token='${T.owner2}'`)).rows[0].status, "Nonaktif")
  const r2 = await usr.toggleUserStatus({ token: T.owner2, id: "u-owner", status: "Nonaktif" }).catch(() => ({ success: false })) as { success: boolean }
  assert.equal(r2.success, false)
})

Deno.test("audit: tanggal lama tetap ditemukan walau log > 3000 baris", async () => {
  await reset()
  await pg.exec(`insert into audit_log(waktu,user_id,nama_user,aksi) values ('2026-11-01T03:00:00Z','u','n','LAMA');
    insert into audit_log(waktu,user_id,nama_user,aksi) select '2026-11-20T03:00:00Z','u','n','BARU' from generate_series(1,3200)`)
  const r = await sdm.listAudit({ token: T.owner, tanggal: "2026-11-01" }) as { data: { aksi: string }[] }
  assert.equal(r.data.length, 1); assert.equal(r.data[0].aksi, "LAMA")
})

Deno.test("pengeluaran: tanggal masa depan ditolak, daftar > 1000 baris utuh", async () => {
  await reset()
  assert.equal(((await trx.createPengeluaran({ jumlah: 1, kategori: "Listrik", deskripsi: "x", tanggal: "2999-01-01" }, owner)) as { success: boolean }).success, false)
  await pg.exec(`insert into pengeluaran(id,tanggal,kategori,deskripsi,jumlah) select 'e'||g,'2026-11-01','Listrik','x',1 from generate_series(1,1500) g`)
  const r = await trx.listPengeluaran() as { data: unknown[] }
  assert.equal(r.data.length, 1500)
})
