// Bukti: kegagalan di tengah jalan tidak boleh meninggalkan data separuh.
import assert from "node:assert/strict"
import { pg, reset } from "./helper.ts"
const trx = await import("../functions/api/handlers/transaksi.ts")
const kasir = { id: "u-kasir", nama: "Kasir", role: "Kasir" } as never
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const hariIni = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
async function dasar() {
  await reset()
  await pg.exec(`update pengaturan set value='0000' where key='jam_mulai'; update pengaturan set value='2359' where key='jam_selesai';
    insert into layanan(nama,harga) values ('Potong',50000);
    insert into produk(kode,nama,stok,harga,skema,persen_kapster) values ('P1','Pomade',5,40000,'Persentase',10),('P2','Wax',5,30000,'Persentase',10);
    insert into absensi(id,tanggal,user_id,nama,role,status) values ('a1','${hariIni()}','u-kap1','K','Kapster','Hadir');`)
}
const n = async (s: string) => Number((await pg.query<{ n: number }>(s)).rows[0].n)

Deno.test("T1 stok produk ke-2 gagal di tengah -> stok produk ke-1 harus kembali dan transaksi tidak tersisa", async () => {
  await dasar()
  // P2 dibuat gagal TEPAT saat mutasi stok: trigger yang menolak
  await pg.exec(`create or replace function tolak_p2() returns trigger language plpgsql as $$ begin if new.kode='P2' then raise exception 'DISK_PENUH'; end if; return new; end $$;
    create trigger t_tolak_p2 before update on produk for each row execute function tolak_p2();`)
  const r = await trx.createTransaksi({ items: [
    { tipe: "Produk", refId: "P1", qty: 2, kapsterId: "u-kap1" }, { tipe: "Produk", refId: "P2", qty: 1, kapsterId: "u-kap1" }],
    metode: "Tunai", bayarTunai: 200000 }, kasir).catch((e: Error) => ({ success: false, error: e.message })) as { success: boolean }
  await pg.exec(`drop trigger t_tolak_p2 on produk`)
  assert.equal(r.success, false)
  assert.equal(await n(`select stok n from produk where kode='P1'`), 5, "stok P1 harus kembali 5")
  assert.equal(await n(`select count(*) n from transaksi`), 0, "tidak boleh ada transaksi tersisa")
  assert.equal(await n(`select count(*) n from transaksi_item`), 0)
})

Deno.test("T2 update-transaksi gagal di tengah -> item lama utuh, stok utuh", async () => {
  await dasar()
  const r = await trx.createTransaksi({ items: [{ tipe: "Produk", refId: "P1", qty: 2, kapsterId: "u-kap1" }], metode: "Tunai", bayarTunai: 200000 }, kasir) as { data: { id: string } }
  await pg.exec(`create or replace function tolak_ins() returns trigger language plpgsql as $$ begin raise exception 'GAGAL_INSERT'; end $$;
    create trigger t_tolak_ins before insert on transaksi_item for each row execute function tolak_ins();`)
  const e = await trx.updateTransaksi({ id: r.data.id, items: [{ tipe: "Produk", refId: "P1", qty: 3, kapsterId: "u-kap1" }] }, owner).catch((x: Error) => ({ success: false, error: x.message })) as { success: boolean }
  await pg.exec(`drop trigger t_tolak_ins on transaksi_item`)
  assert.equal(e.success, false)
  assert.equal(await n(`select count(*) n from transaksi_item where trx_id='${r.data.id}'`), 1, "item lama harus tetap ada")
  assert.equal(await n(`select stok n from produk where kode='P1'`), 3, "stok tetap hasil transaksi awal (5-2)")
})

Deno.test("T3 batal transaksi: bila pengembalian stok gagal, status tidak boleh terlanjur BATAL", async () => {
  await dasar()
  const r = await trx.createTransaksi({ items: [{ tipe: "Produk", refId: "P1", qty: 2, kapsterId: "u-kap1" }], metode: "Tunai", bayarTunai: 200000 }, kasir) as { data: { id: string } }
  await pg.exec(`create or replace function tolak_p() returns trigger language plpgsql as $$ begin raise exception 'GAGAL_STOK'; end $$;
    create trigger t_tolak_p before update on produk for each row execute function tolak_p();`)
  const b = await trx.batalkanTransaksi({ id: r.data.id, alasan: "tes" }, kasir).catch((x: Error) => ({ success: false, error: x.message })) as { success: boolean }
  await pg.exec(`drop trigger t_tolak_p on produk`)
  assert.equal(b.success, false)
  const st = (await pg.query<{ status: string }>(`select status from transaksi where id='${r.data.id}'`)).rows[0].status
  assert.equal(st, "Lunas", "status harus kembali Lunas karena stok tidak jadi dikembalikan")
})

Deno.test("T4 bayar gaji gagal menandai komisi -> gaji tidak boleh tercatat setengah", async () => {
  await dasar()
  await pg.exec(`insert into transaksi(id,waktu,tanggal,jam,metode,subtotal,total,komisi_total,status) values ('T1',now(),'${hariIni()}','10.00','Tunai',100,100,1000,'Lunas');
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster,komisi) values ('T1','Layanan','1','Potong',1,100,'u-kap1','K',1000);
    create or replace function tolak_g() returns trigger language plpgsql as $$ begin raise exception 'GAGAL_TANDAI'; end $$;
    create trigger t_tolak_g before update on transaksi_item for each row execute function tolak_g();`)
  const sdm = await import("../functions/api/handlers/sdm.ts")
  const r = await sdm.bayarGaji({ token: "tok-owner", userId: "u-kap1" }).catch((x: Error) => ({ success: false, error: x.message })) as { success: boolean }
  await pg.exec(`drop trigger t_tolak_g on transaksi_item`)
  assert.equal(r.success, false)
  assert.equal(await n(`select count(*) n from gaji`), 0, "tidak boleh ada gaji tercatat tanpa komisi yang ditandai")
})
