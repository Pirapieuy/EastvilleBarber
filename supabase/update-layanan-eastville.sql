-- Script sinkronisasi layanan Eastville Barbershop sesuai Pricelist Resmi
-- Jalankan di SQL Editor Supabase untuk memperbarui database secara langsung.

-- 1. Tambah kolom bila belum ada
alter table transaksi add column if not exists catatan text default '';
alter table layanan add column if not exists custom_price boolean default false;

-- 2. Nonaktifkan layanan lama yang generic/tidak ada di pricelist resmi
update layanan set status = 'Nonaktif' where nama in ('Haircut', 'Haircut + Cuci', 'Shaving', 'Treatment', 'Hair Coloring', 'Creambath');

-- 3. Masukkan / perbarui 15 layanan resmi Eastville Barbershop
-- HAIRCUT
insert into layanan (nama, harga, kategori, status)
values
  ('Gold Service (Special Service)', 50000, 'Potong', 'Aktif'),
  ('Platinum Service (Cut, Wash & Hot Towel)', 35000, 'Potong', 'Aktif'),
  ('Silver Service (Haircut & Styling)', 30000, 'Potong', 'Aktif'),
  ('Haircut by Krish', 50000, 'Potong', 'Aktif'),
  -- TREATMENT
  ('Keratin Treatment', 180000, 'Perawatan', 'Aktif'),
  ('Creambath Express (Massage, Creambath & Styling)', 20000, 'Perawatan', 'Aktif'),
  ('Anti Dandruff Treatment (Dandruff Medium Till High Condition)', 200000, 'Perawatan', 'Aktif'),
  ('Shaving Service', 30000, 'Perawatan', 'Aktif'),
  -- HAIR COLOR (START FROM)
  ('Basic Color: Black, Brown, Blue Black, etc.', 100000, 'Coloring', 'Aktif'),
  ('Fashion Color: Silver, White, Pink, Green, etc.', 200000, 'Coloring', 'Aktif'),
  ('Highlights Color: Grey, Silver, Blue, etc.', 150000, 'Coloring', 'Aktif'),
  -- HAIR STYLING SERVICE
  ('Korean Perming (Curly/Wavy)', 150000, 'Styling', 'Aktif'),
  ('Korean Downperm (Side, Back or Top)', 70000, 'Styling', 'Aktif'),
  ('Design Perm (Comma Hair, Quiff, etc.)', 150000, 'Styling', 'Aktif'),
  ('Conrow', 150000, 'Styling', 'Aktif')
on conflict do nothing;
