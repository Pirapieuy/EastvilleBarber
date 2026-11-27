# Panduan Kerja — Eastville Barbershop

Aplikasi kasir dan manajemen barbershop. **Frontend** React + Vite + Tailwind, **backend** Supabase
(Edge Function + Postgres).

```
Browser (React)  ──POST {action, token, ...}──▶  Edge Function `api`  ──▶  Postgres
  src/pages/...                                   supabase/functions/api/    supabase/schema.sql
  src/api.ts
```

## Mulai kerja

```bash
git clone https://github.com/east-ville/EastvilleBarber.git
cd EastvilleBarber
cp .env.example .env              # isi VITE_SUPABASE_URL dengan URL project Supabase
pnpm install                      # project ini memakai pnpm
pnpm dev
```

Sebelum selesai: `npx tsc --noEmit -p .` dan `npx vite build` harus bersih.

## Susunan folder

| Folder | Isi |
|---|---|
| `src/` | Frontend |
| `src/api.ts` | Satu-satunya tempat memanggil backend |
| `src/pages/shared/` | Halaman utama (Kasir, Riwayat, Laporan, Produk, ...) |
| `src/pages/<peran>/` | Pembungkus tipis per peran (Owner, Kasir, Kapster) |
| `src/utils/tanggal.ts` | Format dan pilihan tanggal; dipakai semua halaman |
| `supabase/functions/api/` | Backend: `index.ts` (router + hak akses per peran), `handlers/` |
| `supabase/schema.sql` | Struktur database |
| `supabase/tests/` | Tes backend (`deno test --allow-all --no-check`) |

## Aturan kerja

- Commit kecil dan sering; tarik perubahan terbaru sebelum mulai.
- Jangan commit `.env`, kunci `service_role`, atau file rahasia lain.
- Mengubah frontend saja tidak perlu menyentuh `supabase/`.
- Mengubah backend: edit `supabase/functions/api/` (dan `schema.sql` bila tabel berubah), jalankan tes,
  lalu deploy Edge Function dengan Supabase CLI. Baca `supabase/README.md` dulu.
- Jangan menjalankan perubahan database ke project produksi tanpa izin pemilik.

## Aturan tampilan

Lihat `AGENTS.md`: judul halaman mengikuti menu sidebar, jarak 14px, tombol minimal 44px dan teks
minimal 14px di laptop.
