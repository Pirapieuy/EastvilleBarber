// Harness uji backend: Postgres asli (PGlite) + schema.sql asli + handler asli.
// Jalankan: deno test -A --config supabase/tests/deno.json supabase/tests/
Deno.env.set("SUPABASE_URL", "http://fake")
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake")
import { init, pg } from "./fake-supabase.ts"

export { pg }
export const schemaSql = await Deno.readTextFile(new URL("../schema.sql", import.meta.url))
await init(schemaSql)

export const T = { owner: "tok-owner", owner2: "tok-owner2", kasir: "tok-kasir", kapster: "tok-kapster", kapster2: "tok-kapster2" }

/** Kosongkan semua tabel bisnis lalu isi akun + sesi dasar. */
export async function reset() {
  await pg.exec(`truncate table users, sessions, audit_log, kasbon, gaji, absensi, layanan, produk, transaksi,
    transaksi_item, pengeluaran, stok_mutasi, produk_log, komisi_kapster, kode_diskon, tutup_kasir, login_gagal,
    reset_pin, backup restart identity cascade;
    delete from pengaturan; insert into pengaturan(key,value) values ('jam_mulai','1000'),('jam_selesai','2100'),('komisi_default','40'),('komisi_lembur','50');
    insert into users(id,nama,username,pin_hash,role,email) values
      ('u-owner','Owner','owner','x','Owner','o@x.id'),('u-owner2','Owner Dua','owner2','x','Owner','o2@x.id'),
      ('u-kasir','Kasir','kasir','x','Kasir','k@x.id'),
      ('u-kap1','Kapster Satu','kap1','x','Kapster','a@x.id'),('u-kap2','Kapster Dua','kap2','x','Kapster','b@x.id');
    insert into sessions(token,user_id,expire_time) values
      ('${T.owner}','u-owner',now()+interval '1 day'),('${T.owner2}','u-owner2',now()+interval '1 day'),
      ('${T.kasir}','u-kasir',now()+interval '1 day'),
      ('${T.kapster}','u-kap1',now()+interval '1 day'),('${T.kapster2}','u-kap2',now()+interval '1 day');`)
}

/** Buat n transaksi Lunas (satu item layanan, komisi 1000 untuk kapster) lewat SQL langsung. */
export async function seedTransaksi(n: number, kapster = "u-kap1", mulai = 1, tanggal = "2026-11-10") {
  await pg.exec(`insert into transaksi(id,waktu,tanggal,jam,metode,subtotal,total,komisi_total,status)
    select 'T'||g, '${tanggal}T05:00:00Z'::timestamptz + g*interval '1 second', '${tanggal}','12.00','Tunai',2500,2500,1000,'Lunas'
    from generate_series(${mulai},${mulai + n - 1}) g;
    insert into transaksi_item(trx_id,tipe,ref_id,nama,qty,harga,kapster_id,kapster,komisi,komisi_persen)
    select 'T'||g,'Layanan','1','Potong',1,2500,'${kapster}','Kapster','1000',40 from generate_series(${mulai},${mulai + n - 1}) g;`)
}
