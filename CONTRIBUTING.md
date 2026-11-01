# Panduan Kerja Tim — Eastville Barbershop

Aplikasi kasir dan manajemen barbershop. **Frontend** React + Vite + Tailwind (jalan di Figma Make),
**backend** Google Apps Script, **database** Google Sheets.

```
Browser (React)  ──fetch──▶  Google Apps Script  ──baca/tulis──▶  Google Sheets
  src/pages/...               backend/Kode.js (login)               Users, Sessions, Transaksi, ...
  src/api.ts                  backend/Bisnis.js (kasir dst.)
```

## 1. Mulai kerja

```bash
git fetch origin
git checkout <branch-kamu>
git merge origin/rania        # ambil susunan folder & backend terbaru dulu
pnpm install                  # project ini memakai pnpm, jangan npm install
```

Buat file `.env` di **root** (tidak ikut git). **Semua anggota tim memakai URL yang sama** — jangan buat
deployment sendiri. Deployment lain tidak punya kode kasir (`Bisnis.js`) atau minta login Google:

```
VITE_API_URL=https://script.google.com/macros/s/AKfycbz-yQm8hz6o4f8bBZfYOCGHEh32DX4XRIxPZSUlpT_UiQ7MUnQlG_CFZ7i3A8exbDGizw/exec
```

Vite hanya membaca `.env` saat start: **setiap kali `.env` diubah, matikan lalu jalankan ulang dev server.**

Kalau halaman menampilkan banner kuning **"Mode demo"**, penyebabnya tertulis di banner itu:
`Aksi tidak dikenal: ...` berarti `VITE_API_URL` menunjuk deployment lama; `VITE_API_URL belum diisi`
berarti `.env` belum ada atau dev server belum di-restart; `belum login ke server` berarti logout lalu login lagi.

Jalankan frontend: `pnpm dev`. Port 8443 sering sudah dipakai dev server Figma Make yang berjalan
otomatis. Kalau begitu, buka saja `http://localhost:8443` (restart kalau `.env` baru dibuat),
atau jalankan di port lain: `pnpm dev --port 5173`.

Uji login: PIN semua akun demo **123456** — `ardi.owner`, `dian.manajer`, `siti.kasir`, `budi.kapster`.

## 2. Susunan folder

| Folder | Isi |
|---|---|
| `src/` | Frontend (di **root**, Figma Make menjalankannya dari sini) |
| `src/api.ts` | Satu-satunya tempat memanggil backend. Pakai fungsi `api(...)` dan objek `apiXxx` |
| `src/pages/shared/` | Halaman utama (Kasir, Riwayat, Pengeluaran, Produk, ...) |
| `src/pages/<role>/` | Pembungkus tipis per role |
| `backend/` | Apps Script: `Kode.js` (login/sesi), `Bisnis.js` (kasir, transaksi, pengeluaran, stok, pengaturan) |

## 3. Aturan agar tidak bentrok

- **Satu halaman, satu pemilik.** Mau mengubah file milik orang lain? Kabari dulu.
- Commit kecil dan sering. Pull `origin/rania` (atau branch utama tim) sebelum mulai kerja.
- **Jangan edit script lewat editor Google.** Tab editor yang masih terbuka bisa menimpa hasil
  `clasp push`. Ubah di `backend/`, lalu push dengan clasp.
- **`clasp push` hanya dari `backend/`, dan hanya setelah `git pull`.** Cek dulu dengan `clasp status`:
  yang ter-track harus `Bisnis.js`, `Kode.js`, `appsscript.json`. Kalau folder backend kamu versi lama,
  push akan menimpa backend yang sedang jalan.
- Jangan commit `.env`, `service-account.json`, atau file rahasia lain (sudah di `.gitignore`).

## 4. Deploy backend (clasp)

```bash
cd backend
clasp show-authorized-user          # pastikan akun Google yang benar
clasp push -f
clasp deploy -i <ID_DEPLOYMENT> -d "deskripsi"   # update deployment yang sama, URL /exec tidak berubah
```

- Mengganti URL `/exec` berarti semua orang harus mengubah `.env`. Hindari; pakai `clasp deploy -i`.
- Web App harus: **Execute as: Me**, **Who has access: Anyone** (`ANYONE_ANONYMOUS` di manifest).
  Nilai `ANYONE` saja artinya "harus punya akun Google" dan membuat frontend diminta login.
- Memanggil dari `curl`: jangan pakai `-X POST` dengan `-L` (Apps Script membalas lewat redirect).
  Contoh: `curl -sL -d '{"action":"login","username":"siti.kasir","pin":"123456"}' -H "Content-Type: text/plain;charset=utf-8" "$URL"`
- Header request dari browser harus `text/plain` (sudah ditangani `api.ts`) karena Apps Script tidak
  mendukung preflight CORS.

## 5. Menambah fitur (pola yang dipakai)

**Backend** (`backend/Bisnis.js`)
1. Daftarkan action dan role yang boleh di objek `AKSES`.
2. Tambah `case` di `switch` pada `routeBisnis`.
3. Tulis fungsinya. Pakai `readTable_`, `appendObj_`, `setCell_`, `writeAuditLog`; kembalikan `ok_(data)` atau `fail_("pesan")`.
4. Sheet atau kolom baru: tambahkan di `HEADERS` dan naikkan `SCHEMA_VERSION`. `ensureSchema_` membuatnya otomatis.
5. Harga, komisi, dan stok **selalu dihitung di server**, jangan percaya angka dari browser.

**Frontend**
1. Tambahkan fungsi di `src/api.ts`.
2. Di halaman: ambil data lewat `useEffect` kalau `getToken()` ada; kalau tidak, tetap pakai data demo.
   Contoh paling lengkap: `src/pages/shared/ExpensesPage.tsx`.

Peran dan hak akses ada di `AKSES` (backend). Frontend hanya menyembunyikan tombol, jadi **server-lah yang menentukan**.

## 6. Yang sudah tersambung ke backend

Login, Kasir (checkout), Riwayat transaksi (batal/pulihkan), Pengeluaran, Produk dan stok,
komisi kapster dan jam kerja (backend; tampilannya belum ada).

Aturan komisi: layanan 40% untuk kapster (bisa diatur per kapster); di luar jam kerja (default
10:00–21:00) otomatis lembur 50%. Dihitung dari jam transaksi.

## 7. Tugas terbuka (usul untuk Fitra)

1. **Lupa/reset PIN tidak aman:** `reset-pin` hanya meminta email. Perlu token reset yang diverifikasi
   dan punya masa berlaku.
2. **PIN di-hash SHA-256 tanpa salt** dan tidak ada batas percobaan salah. Tambahkan salt dan lockout.
3. **Token sesi memakai `Math.random()`.** Ganti ke `Utilities.getUuid()`.
4. Pastikan sheet database **tidak** di-share "Anyone with the link" (berisi hash PIN).
5. Hapus `package-lock.json` di root (project ini memakai pnpm).
6. Sambungkan halaman yang masih data demo: Beranda, Laporan, Gaji dan kasbon, Absensi, Tim.
7. Kartu "Jam kerja & komisi" di halaman Layanan & Harga, dan sambungkan "Komisi pribadi" di halaman Tim
   (API sudah ada: `apiPengaturan` di `src/api.ts`).
