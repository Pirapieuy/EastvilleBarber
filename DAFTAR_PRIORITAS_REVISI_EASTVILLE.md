# 🎯 DAFTAR PRIORITAS REVISI SISTEM & ROADMAP IMPLEMENTASI
**WEB APLIKASI OPERASIONAL EASTVILLE BARBERSHOP**  
*Berdasarkan Hasil Audit Kelayakan Sistem & Pengalaman Pengguna (UI/UX & QA)*  
*Tanggal Evaluasi: 16 November 2026 | Terakhir Diperbarui: 17 November 2026*  

---

## 📌 RINGKASAN EKSEKUTIF STATUS REVISI

Daftar prioritas ini disusun berdasarkan tingkat urgensi operasional di lapangan, risiko kebocoran finansial, serta dampak terhadap antrean pelanggan barbershop.

| Tingkat Prioritas | Definisi & Dampak | Jumlah Temuan | Status Pengerjaan |
|---|---|:---:|---|
| **P0 (Kritis / Blocker)** | Transaksi macet total, kasir lumpuh, atau nota salah tidak bisa dibatalkan dari sistem. | 2 | 1 Selesai (`P0.2` Void Transaksi), 1 Dilewati (`P0.1` Kamera) |
| **P1 (Tinggi / Finansial)** | Anomali data kehadiran Owner, komisi salah sasaran, kembalian salah, atau laci kasir rawan selisih. | 6 | 3 Selesai (`P1.1`, `P1.2`, `P1.3`), 3 Menunggu |
| **P2 (Sedang / Ergonomi)** | Duplikasi input form, pesan error hantu, tombol kecil di layar HP, atau gaji tanpa rincian. | 7 | ⚠️ Menunggu Eksekusi |
| **P3 (Rendah / Estetika)** | Popup browser kuno (`prompt`/`confirm`) dan badge dekoratif semu di HP kapster. | 2 | ⚠️ Menunggu Eksekusi |

---

## 🔴 TINGKAT 1: PRIORITAS P0 (KRITIS / BLOCKER — OPERASIONAL LUMPUH)
> *Kategori ini wajib ditangani segera karena menghentikan operasional kasir atau mengunci data tanpa opsi koreksi.*

### 1. [P0.1] Transaksi Lumpuh Total Jika Hardware Kamera Tidak Ada / Bermasalah
* **Status:** ⏸️ *Dilewati (Sesuai Arahan Pengguna)*
* **Lokasi File:** `src/pages/shared/CashierPage.tsx` & `src/pages/kasir/AbsensiKapster.tsx`
* **Akar Masalah:** Tombol kapster dikunci mati (`aria-disabled={!isAttended}`) jika belum absen foto hari ini. Jika PC kasir desktop tidak memiliki webcam USB atau izin kamera diblokir browser, kapster tidak bisa dipilih dan seluruh katalog layanan/produk terkunci (`!selectedBarber`).
* **Dampak:** Kasir tidak bisa melayani transaksi saat jam sibuk; POS terhenti total.
* **Solusi Rencana:** Tambahkan tombol toggle *"Tandai Hadir Manual (Darurat)"* berotorisasi PIN / tercatat log audit.

### 2. [P0.2] Tombol "Batalkan Transaksi" (Void) & "Pulihkan" Hilang dari Antarmuka
* **Status:** ✅ **SELESAI DIKERJAKAN** *(Commit `99e1021` di branch `fitra`)*
* **Lokasi File:** `src/pages/shared/HistoryPage.tsx` & `src/index.css`
* **Akar Masalah:** Fungsi `handleConfirmAction`, state `action`, dan modal dialog alasan `ReasonDialog` sudah ada di kode, tetapi tombol pemanggilnya tidak dirender di antarmuka web.
* **Dampak:** Kasir dan Owner sama sekali tidak bisa membatalkan transaksi yang salah input produk atau nota ganda.
* **Solusi yang Telah Diterapkan:**
  - Menambahkan tombol `<Button className="danger-button" onClick={onVoid}><Icon name="alert" /> Batalkan Transaksi</Button>` pada panel detail desktop dan modal detail mobile.
  - Menambahkan tombol `<Button className="secondary-button restore-btn" onClick={onRestore}><Icon name="restore" /> Pulihkan Transaksi</Button>` khusus untuk role Owner jika status transaksi `"BATAL"`.
  - Menambahkan banner informatif (`.detail-void-notice`) yang menampilkan alasan pembatalan, nama pembatal, dan waktu pembatalan.

---

## 🟠 TINGKAT 2: PRIORITAS P1 (TINGGI — INTEGRITAS DATA & KEUANGAN)
> *Kategori ini tidak menghentikan checkout langsung, namun merusak akurasi laporan Owner, salah pembagian komisi, atau memicu selisih uang laci kasir.*

### 3. [P1.1] Bug Anomali Kehadiran: Seluruh Kapster Terdeteksi "0 Hadir" (Tidak Hadir)
* **Status:** ✅ **SELESAI DIKERJAKAN**
* **Lokasi File:** `src/pages/shared/OwnerDashboard.tsx` (baris 116)
* **Akar Masalah:** Dashboard Owner mencari `r.tipe === "Masuk"`, sedangkan endpoint absensi kasir menyimpan `status: "Hadir"` dan `tipe: ""`. Akibatnya variabel `masuk` selalu `undefined`.
* **Dampak:** Dashboard Owner menampilkan kartu indikator merah seolah toko kosong tanpa pekerja, padahal transaksi berjalan normal.
* **Solusi yang Diterapkan:**
  Mengganti filter pencarian jam masuk menjadi:
  `rows.find((r) => r.status === "Hadir" || r.tipe === "Masuk")`.

### 4. [P1.2] Bug Timpa Kapster di Keranjang (Cart Overwrite / 1 Struk Multi-Kapster)
* **Status:** ✅ **SELESAI DIKERJAKAN**
* **Lokasi File:** `src/pages/shared/CashierPage.tsx` & `src/index.css`
* **Akar Masalah:** Fungsi `assignCartToBarber` otomatis menimpa kapster seluruh item di keranjang dengan kapster yang baru diklik di bagian atas.
* **Dampak:** Kasir tidak bisa melayani 1 nota dengan 2 kapster berbeda (misal: Ayah dipotong Ferdi, Anak dipotong Seva). Seluruh komisi salah sasaran ke 1 kapster saja.
* **Solusi yang Diterapkan:**
  - Menghapus fungsi penimpaan massal `assignCartToBarber` saat tombol kapster atas diklik.
  - Mempertahankan kapster independen per baris item di keranjang (`CartLine`).
  - Menambahkan badge & dropdown pemilih kapster per baris item di keranjang (`.cart-line-kapster`), sehingga kasir bisa melihat dan mengubah kapster per layanan langsung dari keranjang.
  - Tombol bayar kasir otomatis menampilkan seluruh kapster yang bertugas dalam nota tersebut, misal: `Bayar (Ferdi, Seva)`.
  - Struk thermal kasir mencantumkan nama kapster per layanan/produk, misal: `Haircut (Ferdi)` dan `Haircut Anak (Seva)`.

### 5. [P1.3] Kalkulasi Kembalian Uang Tunai Hilang pada Metode Pembayaran Gabungan (Split Bill)
* **Status:** ✅ **SELESAI DIKERJAKAN**
* **Lokasi File:** `src/pages/shared/CashierPage.tsx`
* **Akar Masalah:** Nilai `change` di-hardcode `0` jika `method !== "Tunai"`, dan field tunai di Gabungan menduplikasi peran sebagai porsi tagihan sekaligus uang tunai diterima sehingga kelebihan uang tunai tidak dihitung sebagai kembalian.
* **Dampak:** Misal tagihan Rp 60.000, bayar QRIS Rp 20.000 dan tunai lembaran Rp 50.000. Kembalian di layar tertulis Rp 0, kasir bingung dan harus hitung manual di kalkulator HP.
* **Solusi yang Diterapkan:**
  - Memisahkan input porsi tagihan (`Porsi QRIS` & `Porsi Tunai`) dengan input `Uang tunai diterima`.
  - Menambahkan tombol cepat pecahan uang tunai (`Uang pas`, `Rp 50.000`, `Rp 100.000`, dst) untuk porsi tunai pada pembayaran Gabungan.
  - Menghitung kembalian tunai secara otomatis: `change = Math.max(0, cashReceived - tunaiTerpakai)`.
  - Menampilkan banner hijau "Kembalian tunai: Rp ..." di kasir dan mencetak rincian (Tunai Diterima, QRIS, Kembalian) di struk thermal kasir.

### 6. [P1.4] Validasi Kaku: Tidak Bisa Catat Izin / Sakit di Hari Ini (Hari H)
* **Status:** ⏳ **Siap Dikerjakan (1 Jam)**
* **Lokasi File:** `src/pages/kasir/IzinKapster.tsx` & Backend `supabase/functions/api/handlers/sdm.ts` (baris 280)
* **Akar Masalah:** Form input tanggal mematikan hari ini (`min = besokIso`) dan backend menolak: *"Izin, sakit, atau cuti hanya bisa diajukan untuk besok atau setelahnya"*.
* **Dampak:** Kapster yang mendadak demam/sakit saat bangun tidur jam 7 pagi tidak bisa dicatat izinnya oleh kasir; data status absensi kapster menggantung.
* **Solusi Teknis:**
  - Di `IzinKapster.tsx`: ubah nilai minimal datepicker dari `besokIso` menjadi `hariIniIso`.
  - Di backend `sdm.ts`: izinkan `tanggal >= tanggalIso()` khusus untuk status `"Sakit"` dan `"Izin"`.

### 7. [P1.5] Tombol "Download / Unduh Backup" dan "Hapus" Hilang dari Tabel
* **Status:** ⏳ **Siap Dikerjakan (Quick Win / 30 Menit)**
* **Lokasi File:** `src/pages/shared/BackupPage.tsx` (baris 244–255)
* **Akar Masalah:** Fungsi `unduh(row.nama)` dan `hapus(row.nama)` sudah dibuat lengkap di TypeScript, namun tabel arsip backup hanya me-render tombol "Pulihkan".
* **Dampak:** Owner tidak bisa mengunduh file cadangan fisik JSON ke laptop pribadi untuk arsip offline di luar Supabase.
* **Solusi Teknis:**
  - Tambahkan tombol aksi pemicu `unduh(row.nama)` dengan `<Icon name="download" /> Unduh` dan `hapus(row.nama)` dengan icon tempat sampah di kolom `.backup-action-cell`.

### 8. [P1.6] Fitur Tutup Shift Kasir (Cash Drawer Reconciliation) Belum Tersedia di UI
* **Status:** ⏳ **Siap Dikerjakan (1–2 Hari Kerja)**
* **Lokasi File:** `src/pages/shared/CashierPage.tsx` vs Backend `supabase/functions/api/handlers/laporan.ts`
* **Akar Masalah:** Backend Supabase sudah memiliki endpoint lengkap `rekap-kasir` dan `tutup-kasir` untuk menghitung fisik uang laci vs sistem, tetapi di antarmuka kasir belum ada tombol atau modal tutup kasir sama sekali.
* **Dampak:** Kasir pulang hanya dengan menekan log out; rawan kebocoran kas laci (fraud) tanpa audit fisik harian.
* **Solusi Teknis:**
  - Buat modal dialog *"Tutup Shift Kasir"* di halaman Kasir POS.
  - Tampilkan input nominal uang fisik di laci, bandingkan dengan `tunaiSistem`, tampilkan selisih (lebih/kurang), dan cetak struk rekap penutupan shift.

---

## 🟡 TINGKAT 3: PRIORITAS P2 (SEDANG — ERGONOMI & ALUR KERJA)
> *Kategori ini menyebabkan kebingungan bagi kasir pemula, memperlambat pelayanan, atau membatasi transparansi kapster.*

### 9. [P2.1] Duplikasi Input Form Uang Diterima & QRIS pada Halaman Rekap Manual
* **Status:** ⏳ **Siap Dikerjakan (Quick Win / 20 Menit)**
* **Lokasi File:** `src/pages/shared/ManualPage.tsx` (baris 591–611 vs 671–702)
* **Akar Masalah:** Terdapat dua pasang field input nominal pembayaran yang sama di form yang bertumpuk akibat elemen `<dl className="nota-summary">` yang menduplikasi input.
* **Dampak:** Tampilan input berantakan; membingungkan kasir baru yang mengira harus mengisi nominal uang dua kali.
* **Solusi Teknis:** Hapus blok input form bayar tunai/QRIS yang terduplikasi di dalam `<dl className="nota-summary">`.

### 10. [P2.2] Pesan Validasi Error Hantu ("Menu Beri Diskon")
* **Status:** ⏳ **Siap Dikerjakan (Quick Win / 15 Menit)**
* **Lokasi File:** `src/pages/shared/CashierPage.tsx` (baris 561–563)
* **Akar Masalah:** Sistem memunculkan teks error: *"Tagihan Rp 0. Masukkan keterangan diskon di menu Beri Diskon"*, padahal menu bernama "Beri Diskon" tersebut tidak ada di POS.
* **Dampak:** Kasir terjebak (*deadlock*) mencari-cari tombol yang tidak pernah ada saat melayani transaksi gratis/traktiran.
* **Solusi Teknis:** Perbaiki teks validasi menjadi: *"Tagihan Rp 0. Centang Gratis dan isi kolom alasan transaksi gratis."*

### 11. [P2.3] Menu "Pengeluaran" (Operasional) Hilang dari Navigasi Sidebar Owner
* **Status:** ⏳ **Siap Dikerjakan (Quick Win / 20 Menit)**
* **Lokasi File:** `src/layouts/sidebars/SidebarOwner.tsx`
* **Akar Masalah:** Menu pencatatan pengeluaran operasional disatukan secara tersembunyi di dalam tab Laporan Keuangan.
* **Dampak:** Navigasi membingungkan Owner saat ingin mencatat biaya operasional harian (seperti beli galon atau token listrik).
* **Solusi Teknis:** Tambahkan item menu langsung `"Pengeluaran"` pada navigasi sidebar Owner.

### 12. [P2.4] Komisi Kapster Gelondongan Tanpa Rincian Transaksi Layanan
* **Status:** ⏳ **Siap Dikerjakan (2–3 Jam)**
* **Lokasi File:** `src/pages/kapster/MySalaryPage.tsx` & Backend `aktivitas-kapster`
* **Akar Masalah:** Halaman "Gaji Saya" hanya menampilkan 1 kartu angka kumulatif total (misal: Rp 1.400.000) tanpa rincian potong rambut berapa kepala dan produk apa saja yang terjual.
* **Dampak:** Kapster merasa tidak memiliki transparansi perhitungan komisi dan potongan kasbon.
* **Solusi Teknis:** Tampilkan daftar riwayat pengerjaan layanan (No. nota, jam, nama layanan, dan komisi didapat) di menu gaji kapster.

### 13. [P2.5] Hilangnya Halaman Mandiri "Absensi & Jadwal Saya" untuk Kapster
* **Status:** ⏳ **Siap Dikerjakan (1–2 Jam)**
* **Lokasi File:** `src/layouts/sidebars/SidebarKapster.tsx` & `src/App.tsx`
* **Akar Masalah:** Seluruh modul absensi dialihkan ke kasir, sementara kapster kehilangan akses untuk mengecek riwayat jam kerja, jam pulang, dan jadwal liburnya di HP.
* **Dampak:** Kapster tidak bisa memantau rekam kehadiran pribadinya.
* **Solusi Teknis:** Buka kembali akses halaman jadwal dan riwayat kehadiran pribadi di sidebar Kapster.

### 14. [P2.6] Ukuran Tombol Stepper Kuantitas Terlalu Kecil di Layar Sentuh
* **Status:** ⏳ **Siap Dikerjakan (30 Menit)**
* **Lokasi File:** `src/pages/shared/CashierPage.tsx` & `src/index.css`
* **Akar Masalah:** Tombol + dan - pada stepper kuantitas keranjang berukuran 30px x 32px (di bawah standar ergonomis sentuh minimal 44px x 44px).
* **Dampak:** Sering salah pencet (*miss-tap*) di tablet/smartphone kasir, terutama saat jari basah minyak pomade.
* **Solusi Teknis:** Perbesar target sentuh tombol stepper menjadi minimal 44px x 44px pada file CSS.

### 15. [P2.7] Tidak Ada Fitur Edit Item Transaksi Pasca-Simpan
* **Status:** ⏳ **Rencana Jangka Panjang (1 Hari Kerja)**
* **Lokasi File:** `src/pages/shared/HistoryPage.tsx`
* **Akar Masalah:** Jika kasir salah memilih varian pomade, satu-satunya cara adalah membatalkan nota dan menginput ulang dari awal.
* **Dampak:** Memperlambat operasional kasir saat antrean mengular.
* **Solusi Teknis:** Buat fitur edit item transaksi sebelum tutup shift kasir.

---

## 🟢 TINGKAT 4: PRIORITAS P3 (RENDAH — POLISH & TAMPILAN PROFESIONAL)
> *Penyempurnaan visual agar sistem bebas dari kesan amatir dan terlihat rapi.*

### 16. [P3.1] Penggunaan Dialog Bawaan Browser (`prompt`, `confirm`, `alert`)
* **Status:** ⏳ **Siap Dikerjakan (2 Jam)**
* **Lokasi File:** `ServicesPage.tsx`, `ProductsPage.tsx`, `PayrollPage.tsx`
* **Akar Masalah:** Konfirmasi hapus dan input alasan masih menggunakan kotak dialog abu-abu bawaan browser (`window.confirm` / `window.prompt`).
* **Dampak:** Tampilan tidak profesional, tidak konsisten dengan tema desain Eastville, dan rentan diblokir otomatis oleh browser mobile/tablet.
* **Solusi Teknis:** Gantikan dialog native browser dengan modal konfirmasi dialog kustom tema Eastville.

### 17. [P3.2] Elemen UI Semu: Badge "Pelanggan dalam antrean"
* **Status:** ⏳ **Siap Dikerjakan (15 Menit)**
* **Lokasi File:** `src/pages/kapster/KapsterDashboard.tsx` (baris 194)
* **Akar Masalah:** Tampilan menunjukkan teks antrean tanpa angka urutan dan tidak memiliki daftar giliran kerja yang dapat diakses.
* **Dampak:** Menimbulkan ekspektasi fitur antrean otomatis, padahal hanya teks pajangan statis.
* **Solusi Teknis:** Hapus teks dekoratif tersebut atau ganti dengan informasi shift dan target harian yang nyata.

---

## 🚀 ROADMAP EKSEKUSI TAHAP DEMI TAHAP

```
TAHAP 1: QUICK WINS FINANSIAL & OWNER (Selesai dalam 1-2 Jam)
├── [P1.1] Perbaiki Bug Anomali Kehadiran Owner (0 Hadir) di OwnerDashboard.tsx
├── [P1.3] Perbaiki Kalkulasi Kembalian Uang Tunai Split Bill di CashierPage.tsx
├── [P1.4] Buka Akses Izin Sakit Hari H di IzinKapster.tsx & backend sdm.ts
├── [P1.5] Munculkan Tombol Unduh & Hapus Backup di BackupPage.tsx
├── [P2.1] Bersihkan Duplikasi Input Form di ManualPage.tsx
└── [P2.2] Perbaiki Teks Error Hantu "Menu Beri Diskon" di CashierPage.tsx

TAHAP 2: FITUR UTAMA POS & KOMISI (1-2 Hari Kerja)
├── [P1.2] Single-Cart Multi-Kapster (1 Struk Beda Kapster) di CashierPage.tsx
├── [P1.6] Modal Tutup Shift Kasir & Rekonsiliasi Laci di CashierPage.tsx
├── [P2.3] Munculkan Menu Pengeluaran di Sidebar Owner
└── [P2.4] Tampilkan Rincian Pengerjaan Layanan di Gaji Kapster

TAHAP 3: POLISH & ERGONOMI (1-2 Hari Kerja)
├── [P2.5] Buka Akses Jadwal Mandiri di HP Kapster
├── [P2.6] Perbesar Tombol Stepper Kuantitas (+ dan -) Jadi 44px
├── [P3.1] Ganti Window Prompt/Confirm dengan Modal Kustom
└── [P3.2] Hapus Badge Semu Antrean di Beranda Kapster
```
