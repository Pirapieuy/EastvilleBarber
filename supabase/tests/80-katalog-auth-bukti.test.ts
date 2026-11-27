import assert from "node:assert/strict"
import { pg, reset, T } from "./helper.ts"
const kat = await import("../functions/api/handlers/katalog.ts")
const dsk = await import("../functions/api/handlers/diskon.ts")
const aut = await import("../functions/api/handlers/auth.ts")
const usr = await import("../functions/api/handlers/user.ts")
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const q = async (s: string) => (await pg.query<Record<string, unknown>>(s)).rows

Deno.test("L1 layanan: harga 0/negatif/pecahan/teks ditolak", async () => {
  await reset()
  for (const harga of [0, -5, 1.5, "abc", 1e12]) {
    const r = await kat.simpanLayanan({ layanan: { nama: "Cukur", harga } }, owner) as { success: boolean }
    assert.equal(r.success, false, String(harga))
  }
})
Deno.test("L2 hapus layanan yang sudah dipakai transaksi: riwayat tetap utuh", async () => {
  await reset(); await pg.exec(`insert into layanan(nama,harga) values ('Potong',50000);
    insert into transaksi(id,tanggal,jam,metode,subtotal,total,status) values ('X1','2026-11-01','10.00','Tunai',1,1,'Lunas');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster) values ('X1','Layanan','1','Potong',1,50000,'u-kap1','K')`)
  const r = await kat.hapusLayanan({ id: 1, alasan: "salah" }, owner) as { success: boolean }
  assert.equal(r.success, true); assert.equal((await q(`select count(*)::int n from transaksi_item`))[0].n, 1)
})
Deno.test("L3 pengaturan: jam 24:00 / komisi pecahan aneh ditolak; jam selesai > mulai", async () => {
  await reset()
  const base = { jamMulai: "10:00", jamSelesai: "21:00", komisiDefault: 40, komisiLembur: 50, alasan: "tes" }
  for (const o of [{ jamSelesai: "24:00" }, { jamMulai: "25:61" }, { komisiDefault: "abc" }, { komisiLembur: 101 }, { komisiDefault: -1 }, { alasan: "" }]) {
    const r = await kat.simpanPengaturan({ ...base, ...o }, owner) as { success: boolean }
    assert.equal(r.success, false, JSON.stringify(o))
  }
})
Deno.test("L4 komisi kapster: persen untuk akun non-kapster/nonaktif ditolak", async () => {
  await reset()
  const r = await kat.setKomisiKapster({ userId: "u-kasir", persen: 30, alasan: "x" }, owner) as { success: boolean }
  assert.equal(r.success, false)
})
Deno.test("D1 kode diskon: nilai pecahan, persen>100, tanggal nyata, kode duplikat beda huruf", async () => {
  await reset()
  const ok = { kode: "HEMAT10", nama: "x", jenis: "persen", nilai: 10, berlakuSampai: "2999-01-01" }
  assert.equal(((await dsk.simpanKodeDiskon({ kodeDiskon: ok }, owner)) as { success: boolean }).success, true)
  for (const o of [{ nilai: 10.5 }, { nilai: 101 }, { berlakuSampai: "2026-02-31" }, { kode: "hemat-10" }, { nilai: "abc" }]) {
    const r = await dsk.simpanKodeDiskon({ kodeDiskon: { ...ok, kode: "KODEBARU", ...o } }, owner) as { success: boolean }
    assert.equal(r.success, false, JSON.stringify(o))
  }
})
Deno.test("A1 login: pesan salah username dan salah PIN sama (tidak membocorkan akun)", async () => {
  await reset()
  const a = await aut.login({ username: "tidak-ada", pin: "123456" }) as { error: string }
  const b = await aut.login({ username: "owner", pin: "000000" }) as { error: string }
  assert.equal(a.error.startsWith("Username atau PIN salah"), true, a.error)
  assert.equal(b.error.startsWith("Username atau PIN salah"), true, b.error)
  assert.equal(a.error.replace(/\d/, "N"), b.error.replace(/\d/, "N"))
})
Deno.test("A2 login membersihkan sesi kadaluarsa/lama (tabel sessions tidak menggunung)", async () => {
  await reset()
  await pg.exec(`insert into sessions(token,user_id,expire_time,status) select 'old'||g,'u-owner',now()-interval '40 days','Aktif' from generate_series(1,50) g`)
  const { hashPin } = await import("../functions/api/util.ts")
  await pg.exec(`update users set pin_hash='${await hashPin("123456")}' where id='u-owner'`)
  const r = await aut.login({ username: "owner", pin: "123456" }) as { success: boolean }
  assert.equal(r.success, true)
  assert.equal((await q(`select count(*)::int n from sessions where token like 'old%'`))[0].n, 0)
})
Deno.test("A3 logout: token milik orang lain / ngawur tidak membocorkan, sesi benar-benar mati", async () => {
  await reset()
  await aut.logout({ token: T.kasir })
  assert.equal((await q(`select status from sessions where token='${T.kasir}'`))[0].status, "Logout")
  const v = await aut.verifySession({ token: T.kasir }) as { success: boolean }
  assert.equal(v.success, false)
})
Deno.test("U1 buat user: username dinormalkan, PIN 6 digit, username dengan spasi/simbol ditolak", async () => {
  await reset()
  const base = { token: T.owner, nama: "Budi", username: "budi", pin: "123456", role: "Kapster" }
  assert.equal(((await usr.createUser(base)) as { success: boolean }).success, true)
  for (const o of [{ username: "bu di" }, { username: "bu$di" }, { username: "BUDI" }, { pin: "12345" }, { pin: "abcdef" }, { role: "Admin" }]) {
    const r = await usr.createUser({ ...base, ...o }) as { success: boolean }
    assert.equal(r.success, false, JSON.stringify(o))
  }
})
Deno.test("U2 hapus user: kasbon aktif / gaji belum dibayar tidak hilang diam-diam", async () => {
  await reset()
  await pg.exec(`insert into kasbon(id,tanggal,user_id,nama,role,jumlah,status) values ('k1','2026-11-01','u-kap1','K','Kapster',1000,'Aktif')`)
  const r = await usr.deleteUser({ token: T.owner, id: "u-kap1", alasan: "keluar kerja" }) as { success: boolean; error?: string }
  assert.equal(r.success, false, "kapster dengan kasbon aktif harus diselesaikan dulu")
})
