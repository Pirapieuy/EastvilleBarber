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

Uji login: PIN semua akun demo **123456** — `ardi.owner`, `dian.manajer`, `siti.kasir`, `budi.kapster`,
`zhefitra.ananda` (kapster, id `u-kapster2`).

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

### Aturan agar deploy tidak saling menimpa

`clasp push` **menimpa semua file** di proyek Apps Script dengan isi folder `backend/` di laptop
yang mem-push (tidak ada riwayat, tidak ada penggabungan). Salinan `Bisnis.js` atau `Kode.js` yang
basi di laptop siapa pun akan menghapus kerja orang lain di server (pernah terjadi 2 Nov 2026).

1. Kerja di branch sendiri (`rania` / `fitra`). Jangan `clasp push` ke server bersama dari branch itu.
2. Server bersama hanya diisi dari branch gabungan (`mergebackend`) oleh **satu orang**, setelah
   `git fetch` + merge semua branch dan kabar ke grup.
3. Sebelum `clasp push`, cek `git status` bersih dan `backend/Kode.js` + `backend/Bisnis.js` sudah
   hasil gabungan (bukan salinan lama).
4. Jangan edit di editor Google; alurnya satu arah: laptop -> Apps Script.
5. Untuk uji backend sendiri: buat proyek Apps Script + salinan spreadsheet pribadi (`clasp create`),
   isi `.env` dengan URL-nya. `backend/.clasp.json` pribadi jangan di-commit.

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

**Semua halaman sudah tersambung ke backend** (per 2 Nov 2026, server = deployment 32):

| Area | Halaman | Pemilik |
|---|---|---|
| Transaksi | Kasir POS, Riwayat Transaksi (batal/pulihkan), Rekap Manual | Rania |
| Keuangan | Pengeluaran, Laporan Keuangan dan Laporan Produk (Harian/Mingguan/Bulanan, Excel `.xls`, PDF lewat cetak, WhatsApp) | Rania |
| Katalog | Master Produk + stok, Layanan & Harga (+ kategori) dan kartu Jam kerja & komisi | Rania |
| Beranda | Owner, Manajer, Kapster (`aktivitas-kapster`), Komisi Produk Saya | Rania |
| Data | Backup + Pulihkan (Owner) | Rania |
| Akun | Login, Tim, Gaji & Kasbon, Absensi, Jejak Audit | Fitra |

Aksi `Bisnis.js` yang ditambahkan sejak catatan sebelumnya:
- `backup-pulihkan` (Owner): membuat backup pengaman dulu, baru memulihkan.
- `aktivitas-kapster` (Kapster): ringkasan transaksi milik kapster itu sendiri untuk Beranda Kapster.
- `laporan-produk` boleh dipanggil Kapster, tetapi hanya mengembalikan baris miliknya (tanpa bagian pemasok/Eastville).
- `simpan-layanan` kini punya kolom `kategori` (Potong / Grooming / Coloring / Perawatan).
- `simpan-produk` menerima parameter `baru` (true = tambah produk baru, kode harus belum dipakai).
- **Transaksi gratis** = diskon penuh + alasan; ditandai kolom `gratis` di sheet `Transaksi` (`SCHEMA_VERSION` 5).
  Total Rp0 tanpa tanda gratis **ditolak** server.
- `create-transaksi`: diskon oleh Kasir wajib `pinOtorisasi` (PIN Owner/Manajer, dicek server, 5x salah = tunggu 5 menit);
  `clientRequestId` mencegah nota ganda bila Bayar terkirim dua kali.
- `verifikasi-pin-otorisasi` (`{ pin }`, hanya Kasir): cek PIN Owner/Manajer saat klik "Terapkan" diskon, sebelum Bayar.
  Memakai penghitung salah yang sama dengan `create-transaksi` (5x salah = tunggu 5 menit). Balasan `{ valid: true }` atau error.
- Tutup Kasir per shift (sheet baru `TutupKasir`, SCHEMA_VERSION 6): `rekap-kasir` (Kasir; ringkasan sejak tutup terakhir hari itu),
  `tutup-kasir` (`{ uangFisik, catatan }`, Kasir; angka sistem dihitung ulang di server, selisih != 0 wajib catatan),
  `list-tutup-kasir` (Kasir = miliknya, Owner/Manajer = semua). Tunai sistem = total - QRIS per transaksi Lunas.
- `aktivitas-kapster`: tiap baris kini punya `lembur` (true bila transaksi di luar jam kerja). Rincian layanan = baris ber-`type` "Layanan"
  (`trx` = id invoice, `time` = jam, `item` = nama layanan, `comm` = komisi layanan).
- `list-transaksi` kini juga mengirim `bayarTunai`, `bayarQris`, `gratis` (dipakai cetak ulang struk).
- `backup-hapus` dan `backup-unduh` (Owner); `backup-buat` menolak bila sudah ada backup di menit yang sama.
- `hitung-gaji` (Kode.js, Fitra) menghitung transaksi berstatus Lunas sejak gaji terakhir dibayar.

Aturan komisi: layanan 40% untuk kapster (bisa diatur per kapster); di luar jam kerja (default
10:00–21:00) otomatis lembur 50%. Dihitung dari jam transaksi.

### Aturan ID unik
- ID user dibuat otomatis dan diberi akhiran bila bentrok (jangan dua baris `u-kapster`).
- Email user harus unik.
- Kode produk harus unik.
- ID pengeluaran dan nomor invoice dibuat server. **Jangan hapus baris transaksi dengan nomor invoice
  tertinggi di hari itu**, karena penomoran berikutnya bergantung pada nomor tertinggi.

## 7. Pembagian kerja (disepakati Rania & Fitra)

Prinsip: **pemilik data = pemilik halaman.** Masing-masing bekerja di branch sendiri (`rania`, `fitra`).

| Rania | Fitra |
|---|---|
| Layanan & Harga + kartu "Jam kerja & komisi" | Tim (sheet `Users`; sambungkan "Komisi pribadi" ke `apiPengaturan.setKomisiKapster`) |
| Rekap Manual | Absensi (pegawai dan admin) |
| Laporan Keuangan, Laporan Produk | Jejak Audit |
| Beranda Owner dan Manajer | Lupa/Reset PIN + keamanan login (lihat bagian 8) |
| Backup | Halaman Gaji: Gaji & Kasbon, Gaji Saya, Komisi Produk Saya, Beranda Kapster |
| API `list-komisi` (komisi per kapster per periode) untuk halaman Gaji | |

Gaji bergantung pada dua sisi: komisi dari transaksi (data Rania) dan kehadiran (data Fitra).
Rania menyediakan `list-komisi`, Fitra membangun halamannya.

**Aturan backend: satu orang, satu file.**
- Rania: `backend/Bisnis.js`.
- Fitra: file sendiri (misalnya `backend/Akun.js`) dengan fungsi `routeAkun(action, body)`, dipanggil dari
  `default:` di `doPost` (`Kode.js`) setelah `routeBisnis`. Sheet baru milik Fitra didaftarkan di `HEADERS` file-nya sendiri.
- Fungsi bersama (`readTable_`, `appendObj_`, `setCell_`, `ok_`, `fail_`, `writeAuditLog`) dipakai bersama;
  jangan mengubah perilakunya tanpa memberi tahu satu sama lain.
- Di `src/api.ts` tambah bagian terpisah di akhir file (Rania `apiLaporan...`, Fitra `apiTim...`, `apiAbsensi...`).
- **Jangan menyentuh halaman milik orang lain.** Mau ubah komponen bersama (`UI.tsx`, `AppLayout.tsx`)? Kabari dulu.

**Alur git:** kerja di branch masing-masing (`rania` / `fitra`), lalu `git fetch && git merge origin/<branch-lain>`
secara berkala (minimal sehari sekali, dan sebelum mulai fitur baru). Branch **`mergebackend`** adalah
gabungan rania + fitra khusus untuk deploy. Fitra perlu `git merge origin/mergebackend` ke branch `fitra`
agar `Bisnis.js` dan `Kode.js` di branch-nya sama dengan server.

**Deploy hanya dari `mergebackend`**, dengan urutan:
1. `git checkout mergebackend && git pull`, pastikan `git status` bersih.
2. Clone versi live ke folder sementara: `mkdir /tmp/live && cd /tmp/live && clasp clone <scriptId>`.
3. `diff /tmp/live/Kode.js backend/Kode.js` dan `diff /tmp/live/Bisnis.js backend/Bisnis.js`.
   Ada baris di live yang tidak ada di repo = ada kerja orang lain yang belum di-merge. **Berhenti**, merge dulu.
4. Baru `cd backend && clasp push -f && clasp deploy -i <ID_DEPLOYMENT> -d "..."`.

## 8. Tugas keamanan login (Fitra)

1. **Lupa/reset PIN tidak aman:** `reset-pin` hanya meminta email. Perlu token reset yang diverifikasi
   dan punya masa berlaku.
2. **PIN di-hash SHA-256 tanpa salt** dan tidak ada batas percobaan salah. Tambahkan salt dan lockout.
3. **Token sesi memakai `Math.random()`.** Ganti ke `Utilities.getUuid()`.
4. Pastikan sheet database **tidak** di-share "Anyone with the link" (berisi hash PIN).
5. Hapus `package-lock.json` di root (project ini memakai pnpm).
6. Halaman Tim, Absensi, Audit, dan Gaji: lihat pembagian di bagian 7.

## 9. Aturan tampilan (FE) vs backend

- **Tampilan = milik FE (Raga/Sevia).** Branch `raga` adalah acuan terakhir. Yang mengerjakan backend/data **tidak menambah, menghapus, atau mengubah elemen tampilan** (tombol, filter, kolom, teks) tanpa persetujuan. Hanya sambungan data (hook, `api.ts`) yang boleh disentuh.
- Backend menyesuaikan tampilan, bukan sebaliknya: bila tampilan butuh data yang belum ada, buat action baru di `Bisnis.js`.
- Fitur tampilan baru (cari, filter, Excel/PDF, tab Mingguan, dll.) diusulkan ke FE dulu supaya masuk ke desain mereka.
- Pemilih tanggal tidak boleh melewati hari ini maupun sebelum `TANGGAL_MULAI` (`src/utils/tanggal.ts`).
- Daftar panjang di Beranda: tampilkan beberapa baris + tombol "Selengkapnya" ke halaman lengkapnya.

## 10. Pembagian tugas terbaru (3 Nov 2026)

- **Pita (= Sevia):** membuat **fitur baru**.
- **Raga:** **membenahi bug** (perbaikan yang sudah ada, termasuk tampilan).
- **Rania:** backend `Bisnis.js` (menyesuaikan data dengan tampilan) dan merge/deploy via `mergebackend`.
- **Fitra:** backend `Kode.js` (akun, absensi, gaji, audit).
- Fitur tambahan yang ditunda dan menunggu diusulkan ke desain: pencarian/filter/Excel/PDF di Riwayat, Pengeluaran, Layanan & Produk;
  tab Mingguan di Laporan Keuangan; unduh/hapus di Backup; rincian layanan di Gaji Saya (versi lama ada di tag `ui-sebelum-samain-raga`).
