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
  persen numeric not null,
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
