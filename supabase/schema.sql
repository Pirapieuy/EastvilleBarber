-- Skema database Eastville Barber untuk Supabase (Postgres).
-- Mengikuti kolom sheet di backend/Kode.js dan backend/Bisnis.js satu per satu.
-- Tanggal dan jam disimpan sebagai teks (YYYY-MM-DD, HH:MM) seperti di Sheet,
-- supaya bentuk data ke frontend sama dan tidak ada masalah zona waktu.
-- Jalankan di Supabase: SQL Editor > New query > tempel > Run.

create table if not exists users (
  id text primary key,
  nama text not null,
  username text not null unique,
  pin_hash text not null,          -- format salt$sha256, sama dengan GAS
  role text not null check (role in ('Owner','Kasir','Kapster')),
  cabang text default '',
  email text default '',
  status text not null default 'Aktif',
  dibuat timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  login_time timestamptz not null default now(),
  expire_time timestamptz not null,
  status text not null default 'Aktif'
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  user_id text default '',
  nama_user text default '',
  aksi text not null,
  detail text default '',
  alasan text default ''
);

create table if not exists kasbon (
  id text primary key,
  tanggal text not null,
  user_id text not null references users(id),
  nama text, role text,
  jumlah numeric not null,
  status text not null,
  catatan text default '',
  dibuat_oleh text default '',
  lunas_waktu timestamptz
);

create table if not exists gaji (
  id text primary key,
  periode text not null,
  user_id text not null references users(id),
  nama text, role text,
  total_komisi numeric default 0,
  total_kasbon numeric default 0,
  gaji_bersih numeric default 0,
  status text not null,
  tanggal_bayar timestamptz,
  dibayar_oleh text default '',
  catatan text default ''
);

create table if not exists absensi (
  id text primary key,
  waktu timestamptz not null default now(),
  tanggal text not null,
  jam text,
  user_id text not null references users(id),
  nama text, role text,
  tipe text,
  foto_url text default '',
  status text not null,
  catatan text default ''
);
create index if not exists absensi_tanggal_idx on absensi(tanggal);

create table if not exists layanan (
  id bigint generated always as identity primary key,
  nama text not null,
  harga numeric not null,
  status text not null default 'Aktif',
  kategori text default ''
);

create table if not exists produk (
  kode text primary key,
  nama text not null,
  penjual text default '',
  stok integer not null default 0,
  skema text not null default 'Persentase',
  status text not null default 'Aktif',
  harga numeric not null default 0,
  harga_modal numeric not null default 0,
  persen_kapster numeric default 0,
  persen_penjual numeric default 0,
  persen_eastville numeric default 0,
  nominal_kapster numeric default 0,
  nominal_penjual numeric default 0,
  nominal_eastville numeric default 0
);

create table if not exists transaksi (
  id text primary key,
  waktu timestamptz not null default now(),
  tanggal text not null,
  jam text,
  metode text,
  subtotal numeric default 0,
  diskon numeric default 0,
  total numeric default 0,
  bayar_tunai numeric default 0,
  bayar_qris numeric default 0,
  komisi_total numeric default 0,
  status text not null default 'SELESAI',
  dibuat_oleh_id text default '',
  dibuat_oleh text default '',
  void_alasan text default '',
  void_oleh text default '',
  void_waktu timestamptz,
  lembur text default 'Tidak',      -- 'Ya' / 'Tidak' seperti di Sheet
  manual text default '',           -- 'Ya' bila rekap manual
  nota_buku text default '',
  gratis text default ''            -- alasan bila transaksi gratis
);
create index if not exists transaksi_tanggal_idx on transaksi(tanggal);

create table if not exists transaksi_item (
  id bigint generated always as identity primary key,
  trx_id text not null references transaksi(id) on delete cascade,
  tipe text, ref_id text, nama text,
  qty integer default 1,
  harga numeric default 0,
  kapster_id text default '', kapster text default '',
  komisi numeric default 0,
  komisi_persen numeric default 0
);
create index if not exists transaksi_item_trx_idx on transaksi_item(trx_id);

create table if not exists pengeluaran (
  id text primary key,
  tanggal text not null,
  kategori text,
  deskripsi text,
  jumlah numeric not null,
  status text not null default 'Aktif',
  alasan_batal text default '',
  dibuat_oleh text default '',
  waktu timestamptz not null default now()
);

create table if not exists stok_mutasi (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  kode text, delta integer, stok_akhir integer,
  alasan text, trx_id text, oleh text
);

create table if not exists produk_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  kode text, produk text, perubahan text, oleh text, alasan text
);

create table if not exists pengaturan (
  key text primary key,
  value text
);
insert into pengaturan(key, value) values
  ('jam_mulai','1000'), ('jam_selesai','2100'),
  ('komisi_default','40'), ('komisi_lembur','50')
on conflict (key) do nothing;

create table if not exists komisi_kapster (
  user_id text primary key references users(id),
  persen numeric,                   -- kosong = pakai komisi default
  diubah_oleh text,
  waktu timestamptz not null default now()
);

create table if not exists kode_diskon (
  id text primary key,
  kode text not null unique,
  nama text,
  persen numeric default 0,
  berlaku_sampai text default '',
  status text not null default 'Aktif',
  dibuat_oleh text default '',
  waktu timestamptz not null default now(),
  dipakai integer default 0,
  jenis text default 'persen',
  nilai numeric default 0
);

create table if not exists tutup_kasir (
  id text primary key,
  waktu timestamptz not null default now(),
  tanggal text,
  kasir_id text, kasir text,
  dari_waktu timestamptz,
  jumlah_trx integer default 0,
  penjualan numeric default 0,
  diskon numeric default 0,
  tunai_sistem numeric default 0,
  qris_sistem numeric default 0,
  uang_fisik numeric default 0,
  selisih numeric default 0,
  catatan text default ''
);

-- Semua akses lewat Edge Function (service_role). Tabel dikunci dari akses
-- langsung browser: RLS aktif tanpa policy = anon key tidak bisa baca/tulis apa pun.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Pembatas salah PIN (pengganti CacheService di GAS): 5x salah = kunci 5 menit.
create table if not exists login_gagal (
  username text primary key,
  jumlah integer not null default 0,
  kunci_sampai timestamptz,
  terakhir timestamptz not null default now()
);
alter table login_gagal enable row level security;

-- Hanya Edge Function (service_role) yang boleh menyentuh tabel; browser (anon/authenticated) tidak.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Token reset PIN (pengganti CacheService, berlaku 15 menit).
create table if not exists reset_pin (token text primary key, email text not null, kadaluarsa timestamptz not null); alter table reset_pin enable row level security; grant all on reset_pin to service_role;

-- Ubah stok secara atomik (pengganti LockService di GAS). Stok habis -> Nonaktif,
-- diisi lagi dari 0 -> Aktif. Mengembalikan stok akhir, atau null bila produk tidak ada.
create or replace function mutasi_stok(p_kode text, p_delta integer, p_alasan text, p_trx text, p_oleh text)
returns integer language plpgsql security definer set search_path = public as $$
declare lama integer; akhir integer; st text;
begin
  select stok, status into lama, st from produk where kode = p_kode for update;
  if not found then return null; end if;
  akhir := lama + p_delta;
  if akhir < 0 then raise exception 'STOK_KURANG:%', p_kode; end if;
  update produk set stok = akhir,
    status = case
      when akhir <= 0 and st = 'Aktif' then 'Nonaktif'
      when p_delta > 0 and lama <= 0 and akhir > 0 and st = 'Nonaktif' then 'Aktif'
      else st end
  where kode = p_kode;
  insert into stok_mutasi(kode, delta, stok_akhir, alasan, trx_id, oleh)
    values (p_kode, p_delta, akhir, p_alasan, coalesce(p_trx,''), p_oleh);
  return akhir;
end $$;
revoke all on function mutasi_stok(text,integer,text,text,text) from public, anon, authenticated;
grant execute on function mutasi_stok(text,integer,text,text,text) to service_role;

-- Backup (padanan sheet BAK_ di GAS): snapshot JSON tabel bisnis. Akun (users/sessions) tidak disentuh.
create table if not exists backup (
  nama text primary key,            -- BAK_yyyyMMdd_HHmm
  dibuat timestamptz not null default now(),
  sheet integer not null,
  baris integer not null,
  data jsonb not null
);
alter table backup enable row level security;
grant all on backup to service_role;

create or replace function buat_backup(p_nama text, p_simpan integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t text; d jsonb := '{}'::jsonb; j jsonb; n integer; total integer := 0; jml integer := 0;
begin
  foreach t in array array['layanan','produk','transaksi','transaksi_item','pengeluaran','stok_mutasi',
                           'produk_log','pengaturan','komisi_kapster','tutup_kasir',
                           'kasbon','gaji','absensi','kode_diskon'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb), count(*) from %I x', t) into j, n;
    d := d || jsonb_build_object(t, j); total := total + n; jml := jml + 1;
  end loop;
  insert into backup(nama, sheet, baris, data) values (p_nama, jml, total, d);
  delete from backup where nama not in (select nama from backup order by nama desc limit p_simpan);
  return jsonb_build_object('nama', p_nama, 'baris', total);
end $$;

-- Pulihkan snapshot. Hanya tabel yang ADA di snapshot yang dihapus lalu diisi ulang (snapshot lama tanpa
-- kasbon/gaji/absensi/kode_diskon tidak menghapus data itu). Akun (users/sessions) tidak disentuh.
create or replace function pulihkan_backup(p_nama text)
returns integer language plpgsql security definer set search_path = public as $$
declare t text; c text; d jsonb; jml integer := 0; seq text;
begin
  select data into d from backup where nama = p_nama;
  if d is null then return null; end if;
  -- urutan penting: anak dihapus dulu (item sebelum transaksi)
  foreach t in array array['transaksi_item','transaksi','layanan','produk','pengeluaran','stok_mutasi',
                           'produk_log','pengaturan','komisi_kapster','tutup_kasir',
                           'kasbon','gaji','absensi','kode_diskon'] loop
    if d ? t then execute format('delete from %I where true', t); end if;
  end loop;
  foreach t in array array['pengaturan','layanan','produk','transaksi','transaksi_item','pengeluaran',
                           'stok_mutasi','produk_log','komisi_kapster','tutup_kasir',
                           'kasbon','gaji','absensi','kode_diskon'] loop
    if d ? t then
      execute format('insert into %I overriding system value select * from jsonb_populate_recordset(null::%I, $1)', t, t) using d->t;
      jml := jml + 1;
      foreach c in array array['id','urut'] loop
        if exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=c and is_identity='YES') then
          seq := pg_get_serial_sequence(t, c);
          execute format('select setval(%L, greatest((select coalesce(max(%I),0) from %I),1))', seq, c, t);
        end if;
      end loop;
    end if;
  end loop;
  -- Snapshot lama belum mengenal penanda gaji: komisi yang waktunya sebelum gaji terakhir dianggap sudah dibayar.
  perform tandai_komisi_lama();
  return jml;
end $$;
revoke all on function buat_backup(text,integer), pulihkan_backup(text) from public, anon, authenticated;
grant execute on function buat_backup(text,integer), pulihkan_backup(text) to service_role;
-- Urutan masuk (pengganti nomor baris di Sheet) untuk tabel yang tampil "terbaru dulu"/"urut sheet".
alter table produk add column if not exists urut bigint generated always as identity;
alter table kasbon add column if not exists urut bigint generated always as identity;
alter table gaji add column if not exists urut bigint generated always as identity;
-- Kasbon yang dilunasi lewat pembayaran gaji menyimpan id gaji-nya (rincian di Gaji & Kasbon).
alter table kasbon add column if not exists gaji_id text;
alter table kode_diskon add column if not exists urut bigint generated always as identity;

-- Foto absensi disimpan di Storage (bucket publik 'absensi'); kolom absensi.foto_url hanya berisi alamatnya.
-- Bucket hanya menerima JPEG maksimal 200 KB. Upload hanya lewat Edge Function (service_role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absensi','absensi', true, 200000, array['image/jpeg'])
on conflict (id) do update set public=true, file_size_limit=200000, allowed_mime_types=array['image/jpeg'];

-- Komisi yang sudah dibayarkan ditandai di barisnya sendiri (transaksi_item.gaji_id), bukan dari tanggal gaji terakhir.
-- Dengan penanda per baris, transaksi manual bertanggal mundur atau hasil edit tidak ikut hilang dari gaji berikutnya.
-- Urutan: kolom dulu, fungsi, baru pindahan data lama (sekali, hanya saat kolom baru dibuat).
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='transaksi_item' and column_name='gaji_id') then
    alter table transaksi_item add column gaji_id text;
  end if;
end $$;
create index if not exists transaksi_item_belum_gaji_idx on transaksi_item(kapster_id) where gaji_id is null;

-- Tandai komisi lama: item milik kapster dengan waktu transaksi <= pembayaran gaji terakhirnya dianggap sudah dibayar.
create or replace function tandai_komisi_lama() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update transaksi_item i set gaji_id = (
    select g.id from gaji g, transaksi t
    where t.id = i.trx_id and g.user_id = i.kapster_id and g.status = 'Dibayar'
      and g.tanggal_bayar is not null and t.waktu <= g.tanggal_bayar
    order by g.tanggal_bayar desc limit 1)
  where i.gaji_id is null and exists (
    select 1 from gaji g, transaksi t
    where t.id = i.trx_id and g.user_id = i.kapster_id and g.status = 'Dibayar'
      and g.tanggal_bayar is not null and t.waktu <= g.tanggal_bayar);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function tandai_komisi_lama() from public, anon, authenticated;
grant execute on function tandai_komisi_lama() to service_role;
-- Pindahan data lama: hanya sekali, selama belum ada item bertanda dan sudah ada gaji dibayar.
do $$
begin
  if not exists (select 1 from transaksi_item where gaji_id is not null) then perform tandai_komisi_lama(); end if;
end $$;

-- Komisi kapster yang belum dibayar: total, jumlah baris, dan id barisnya (agar yang dibayar = yang dihitung).
create or replace function komisi_belum_dibayar(p_user text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', coalesce(sum(i.komisi), 0),
    'jumlah', count(distinct i.trx_id),
    'ids', coalesce(jsonb_agg(i.id order by i.id), '[]'::jsonb))
  from transaksi_item i join transaksi t on t.id = i.trx_id
  where i.kapster_id = p_user and i.gaji_id is null and t.status in ('Lunas','Selesai');
$$;
revoke all on function komisi_belum_dibayar(text) from public, anon, authenticated;
grant execute on function komisi_belum_dibayar(text) to service_role;

-- Kunci bernama (mutex) untuk aksi yang tidak boleh jalan dobel, mis. bayar gaji. Kedaluwarsa otomatis.
create table if not exists kunci (nama text primary key, sampai timestamptz not null);
alter table kunci enable row level security;
grant all on kunci to service_role;
create or replace function kunci_ambil(p_nama text, p_detik integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into kunci(nama, sampai) values (p_nama, now() + make_interval(secs => p_detik))
  on conflict (nama) do update set sampai = excluded.sampai where kunci.sampai < now();
  get diagnostics n = row_count;
  return n > 0;
end $$;
create or replace function kunci_lepas(p_nama text) returns void
language sql security definer set search_path = public as $$ delete from kunci where nama = p_nama; $$;
revoke all on function kunci_ambil(text,integer), kunci_lepas(text) from public, anon, authenticated;
grant execute on function kunci_ambil(text,integer), kunci_lepas(text) to service_role;

-- Pengenal permintaan dari kasir (anti dobel-klik, tahan restart server; menggantikan memori sementara).
alter table transaksi add column if not exists req_id text;
create unique index if not exists transaksi_req_id_uniq on transaksi(req_id) where req_id is not null;
