# Backend Supabase

Pengganti `backend/` (Google Apps Script). Frontend tetap memanggil `POST {action, token, ...}`,
jadi bentuk permintaan dan balasan sama dengan GAS.

- `schema.sql`: tabel, fungsi SQL (stok atomik, backup/pulihkan), hak akses. Jalankan sekali.
- `functions/api/`: satu Edge Function `api`. `index.ts` = router + hak akses per peran (salinan `AKSES` di Bisnis.js).
  `handlers/` = logika per kelompok (auth, user, katalog, produk, diskon, transaksi, laporan, sdm, backup).
- `../scripts/migrasi-gas.py`: mengubah data hasil unduhan GAS menjadi SQL untuk Supabase.

## Perintah
```
npx supabase login                                  # sekali, di Terminal biasa
npx supabase link --project-ref zejaqgqpyrjvlarnxyaq
npx supabase db query --linked --yes -f supabase/schema.sql
npx supabase functions deploy api --remote=zejaqgqpyrjvlarnxyaq --no-verify-jwt --yes
```

## Beda dengan GAS
- Semua tabel RLS aktif tanpa policy: browser tidak bisa baca tabel langsung, hanya lewat fungsi `api`.
- Kunci rahasia (`service_role`) hanya ada di server Supabase, tidak pernah di kode atau `.env`.
- `LockService` diganti fungsi SQL atomik (`mutasi_stok`); `CacheService` diganti tabel (`login_gagal`, `reset_pin`)
  dan memori fungsi (`clientRequestId`, hanya sebagai jaring pengaman tambahan).
- Backup: snapshot JSON di tabel `backup` (5 terakhir), dibuat dari menu Backup di aplikasi. Paket gratis Supabase TIDAK punya backup otomatis sendiri, dan snapshot ini tersimpan di database yang sama, jadi unduh berkala sebagai salinan di luar Supabase.
- `ringkasan-laporan` (versi lama Tim B) membaca status "Lunas" dan "Selesai" (di GAS hanya "Selesai" sehingga selalu kosong).
- Foto absensi disimpan di Storage (bucket publik `absensi`, JPEG maks 200 KB); `absensi.foto_url` berisi alamatnya.
