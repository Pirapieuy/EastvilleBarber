-- ============================================================
-- SERAH TERIMA: kosongkan semua data bisnis, sisakan akun.
-- JANGAN dijalankan sebelum membuat backup (Supabase > Database > Backups,
-- atau tombol Buat Backup di halaman Backup Data).
-- Jalankan manual di Supabase SQL Editor pada project yang benar.
-- Tidak bisa dibatalkan setelah COMMIT.
--
-- DIPERTAHANKAN : users (akun), sessions (login aktif), pengaturan (jam kerja, komisi default)
-- DIKOSONGKAN   : transaksi, transaksi_item, pengeluaran, kasbon, gaji, absensi,
--                 produk, produk_log, stok_mutasi, layanan, komisi_kapster, kode_diskon,
--                 tutup_kasir, audit_log, login_gagal, reset_pin, backup, kunci
-- ============================================================

begin;

-- Satu perintah TRUNCATE supaya urutan foreign key tidak jadi masalah.
truncate table
  transaksi_item,
  transaksi,
  pengeluaran,
  kasbon,
  gaji,
  absensi,
  stok_mutasi,
  produk_log,
  produk,
  layanan,
  komisi_kapster,
  kode_diskon,
  tutup_kasir,
  audit_log,
  login_gagal,
  reset_pin,
  backup,
  kunci
restart identity;

-- Periksa dulu sebelum COMMIT: akun harus utuh, sisanya 0.
select 'users' as tabel, count(*) from users
union all select 'transaksi', count(*) from transaksi
union all select 'produk', count(*) from produk
union all select 'layanan', count(*) from layanan
union all select 'absensi', count(*) from absensi
union all select 'audit_log', count(*) from audit_log;

-- Bila hasilnya benar, jalankan:  commit;
-- Bila salah, jalankan:           rollback;

-- CATATAN SETELAH COMMIT
-- 1) Foto absensi ada di Storage, bukan di tabel. TRUNCATE tidak menghapusnya:
--    Supabase > Storage > bucket "absensi" > pilih semua > Delete. Bucket itu publik,
--    jadi foto lama masih bisa dibuka lewat alamatnya sampai dihapus.
-- 2) Akun di tabel users masih membawa PIN dan email asli. Ganti PIN tiap akun
--    sebelum diserahkan, atau buat akun baru lalu hapus akun lama.
-- 3) pengaturan (jam kerja, komisi default) sengaja dipertahankan; ubah bila perlu.
