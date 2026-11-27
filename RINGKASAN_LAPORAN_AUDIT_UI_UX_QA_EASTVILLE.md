# 📑 RINGKASAN LENGKAP LAPORAN AUDIT UI/UX & QA
**WEB APLIKASI OPERASIONAL EASTVILLE BARBERSHOP**  
*Auditor: Senior Product Design Consultant (UI/UX) & Lead Quality Assurance (QA) Tester*  
*Lingkup Audit: Frontend (`src/`), Integrasi Backend (`supabase/functions/api/`), dan Ergonomi Lintas Peran*  
*Tanggal Evaluasi: 16 November 2026*  
*Status Kelayakan: ⚠️ Memerlukan Perbaikan Kritis Sebelum Peluncuran Produksi Penuh*

---

## BAGIAN I: FIRST IMPRESSION & KELUHAN UTAMA PER ROLE

### 👤 1. Monolog Siti Rahma (Kasir Operasional Harian)
> *"Duh, ini hari Sabtu sore jam 4, antrean di lobi ada 6 orang, anak-anak sama bapaknya udah nungguin. Pas saya mau input transaksi pertama Mas Ferdi, tombol namanya warna abu-abu dan mati! Pas saya klik, layarnya mendadak buka kamera minta foto selfie Ferdi. Padahal Ferdi lagi megang gunting dan rambut pelanggan basah. Di meja kasir ini saya pakai **PC komputer desktop toko yang nggak punya webcam USB**! Akibatnya, saya nggak bisa milih Mas Ferdi sama sekali, dan tombol tambah layanan cukur di katalog langsung kekunci: 'Kapster belum absen'. Transaksi macet total, saya terpaksa nulis nota di kertas bon manual warung!*
>
> *Terus pas ada pelanggan bayar split: 40 ribu tunai dan 20 ribu QRIS, uangnya lembaran 50 ribu. Saya cari-cari di layar mana angka kembaliannya, ternyata kembaliannya **tertulis Rp 0**! Saya harus hitung manual di kalkulator HP. Begitu ada salah pencet varian pomade di nota tadi, saya buka menu Riwayat Transaksi mau batalkan nota... loh, **tombol 'Batalkan Transaksi'-nya mana**?! Cuma ada tombol 'Cetak Struk'! Kalau malam pas saya mau pulang tutup kasir, **nggak ada tombol 'Tutup Kasir'** buat ngitung uang laci, saya cuma bisa log out gitu aja tanpa tahu uang laci selisih atau pas."*

### ✂️ 2. Monolog Ferdi / Seva (Kapster Lapangan)
> *"Saya buka web ini dari HP Android saya pas sela-sela nyapu rambut. Jempol saya masih agak basah kena minyak pomade dan hair tonic. Pas saya buka menu samping, saya bingung nyari **'Absensi & Jadwal Saya' kok nggak ada**? Di dashboard cuma ada tulisan kecil: 'Absensi belum dicatat kasir'. Jadi saya nggak bisa absen selfie sendiri dari HP saya? Kemarin pas saya meriang demam bangun tidur jam 7 pagi, saya WA kasir minta tolong diizinkan sakit hari ini. Kata Mbak Siti di sistemnya tanggal hari ini dikunci abu-abu dan muncul error: **'Hanya bisa diajukan untuk besok (H-1)'**. Masa orang sakit harus janjian dari kemarin?*
>
> *Terus pas saya cek menu 'Gaji Saya', angkanya **cuma gelondongan satu total komisi**: Rp 1.400.000. Saya nggak bisa lihat rinciannya jasa potong berapa, jual pomade berapa, potong kasbon berapa. Tombol panah dan angka kecil-kecil banget di layar HP, sering salah pencet. Di beranda ada badge tulisan 'Pelanggan dalam antrean', saya kira bisa diklik buat lihat siapa giliran potong berikutnya, ternyata cuma teks pajangan mati."*

### 👔 3. Monolog Ardi Pradana (Owner & Pengambil Keputusan)
> *"Saya pantau operasional cabang Patihan dari laptop saat saya lagi di luar kota. Begitu saya buka Beranda Owner jam 2 siang, saya kaget: kartu Status Kehadiran Tim warnanya merah dan **seluruh kapster saya statusnya 'Tidak Hadir' (0 kapster hadir)**! Padahal di laporan omzet ada transaksi masuk dari Seva dan Ferdi. Setelah diaudit tim teknis, ternyata sistem mencari status 'Masuk', padahal kasir mencatatnya dengan status 'Hadir'. Ini anomali data fatal yang bikin dashboard saya menyesatkan.*
>
> *Saat saya mau download backup database ke laptop saya buat arsip mingguan di menu Backup Data, ternyata di tabel **cuma ada tombol 'Pulihkan'—tombol 'Download/Unduh'-nya hilang dari layar**! Kalau saya salah klik 'Pulihkan', data transaksi hari ini bisa tertimpa data lama. Selain itu, banyak aksi penghapusan produk dan pengeluaran masih pakai popup browser bawaan 'prompt' dan 'confirm' yang kuno dan rentan terblokir browser tablet. Keamanan dan akurasi angka belum solid untuk skala bisnis barbershop multi-cabang."*

---

## BAGIAN II: MATRIKS LENGKAP 16 TEMUAN AUDIT (SEVERITY P0 – P3)

| No | Sev | Role | Modul & File | Masalah & Kejanggalan Ditemukan | Dampak pada Pengguna |
|:--:|:---:|:---:|---|---|---|
| **1** | **P0** | Kasir | `CashierPage.tsx` & `AbsensiKapster.tsx` | **Transaksi Lumpuh Total Tanpa Kamera:** Tombol kapster dikunci mati (`disabled`) jika belum absen foto. Jika PC kasir tidak punya webcam, kasir tidak bisa memilih kapster sama sekali dan seluruh item layanan/produk terkunci (`!selectedBarber`). | Kasir tidak bisa melayani transaksi saat jam sibuk; POS terhenti total. |
| **2** | **P0** | Kasir & Owner | `HistoryPage.tsx` (`TransactionDetailBody`) | **Tombol "Batalkan Transaksi" (Void) & "Pulihkan" Hilang dari UI:** State action, fungsi `handleConfirmAction`, dan modal `ReasonDialog` sudah ada di kode, tapi tombol pemanggilnya tidak dirender di antarmuka. | Kasir dan Owner sama sekali tidak bisa membatalkan transaksi yang salah input atau nota ganda dari web. |
| **3** | **P1** | Owner | `OwnerDashboard.tsx` (baris 115–140) | **Bug Anomali Kehadiran (0 Hadir):** Dashboard Owner mencari `r.tipe === "Masuk"`, sedangkan endpoint absensi kasir menyimpan `status: "Hadir"` dan `tipe: ""`. | Dashboard Owner menampilkan informasi palsu (indikator merah) seolah toko kosong tanpa kapster bekerja. |
| **4** | **P1** | Kasir & Kapster | `IzinKapster.tsx` & Backend `sdm.ts` (L279) | **Validasi Kaku: Tidak Bisa Catat Izin/Sakit Hari Ini (Hari H):** Datepicker mematikan hari ini (`min = besokIso`) dan backend menolak: *"Izin, sakit... hanya bisa diajukan untuk besok atau setelahnya"*. | Kapster yang sakit mendadak di pagi hari tidak bisa diinput ke sistem; data menggantung. |
| **5** | **P1** | Kasir | `CashierPage.tsx` (baris 28–43) | **Bug Timpa Kapster di Keranjang (Cart Overwrite Bug):** Fungsi `assignCartToBarber` otomatis menimpa kapster seluruh item di keranjang dengan kapster yang baru diklik. | Tidak bisa melayani 1 nota dengan 2 kapster berbeda (bapak & anak). Komisi salah sasaran ke 1 kapster saja. |
| **6** | **P1** | Kasir | `CashierPage.tsx` (baris 548) | **Kalkulasi Kembalian Tunai Hilang pada Metode Gabungan:** Nilai `change` di-hardcode 0 jika `method !== "Tunai"`. Pada Split Bill, kembalian tunai tertulis Rp 0 di layar dan struk. | Kasir bingung menghitung kembalian uang fisik; rawan salah memberi uang kembalian. |
| **7** | **P1** | Owner | `BackupPage.tsx` (baris 244–255) | **Tombol "Download/Unduh Backup" dan "Hapus" Hilang dari Tabel:** Fungsi `unduh()` dan `hapus()` sudah dibuat di TypeScript, namun tabel arsip hanya menampilkan tombol "Pulihkan". | Owner tidak bisa mengunduh file cadangan fisik JSON ke laptop pribadi untuk arsip offline. |
| **8** | **P1** | Kasir & Owner | Frontend `src/` vs Backend `laporan.ts` | **Fitur Tutup Shift Kasir Belum Tersedia di UI:** Backend memiliki endpoint `rekap-kasir` dan `tutup-kasir` untuk rekonsiliasi laci fisik vs sistem, tapi di UI kasir tidak ada tombol/modalnya. | Kasir pulang hanya dengan log out; rawan kebocoran kas laci (fraud) tanpa audit fisik. |
| **9** | **P2** | Kapster | `App.tsx` & `SidebarKapster.tsx` | **Hilangnya Halaman Mandiri "Absensi & Jadwal Saya":** Modul absensi dialihkan ke Kasir, sementara kapster kehilangan akses untuk mengecek riwayat jam masuk, pulang, dan jadwal liburnya di HP. | Kapster merasa tidak memiliki transparansi jam kerja dan shift di perangkat pribadinya. |
| **10** | **P2** | Kasir | `ManualPage.tsx` (L591–611 vs 671–702) | **Duplikasi Input Form Uang Diterima & QRIS:** Terdapat dua pasang field input nominal pembayaran yang sama di form yang bertumpuk akibat elemen `<dl>` summary. | Tampilan input berantakan; membingungkan kasir baru yang mengira harus mengisi uang 2 kali. |
| **11** | **P2** | Kasir | `CashierPage.tsx` (baris 561–563) | **Pesan Validasi Error Hantu ("Menu Beri Diskon"):** Muncul error: *"Tagihan Rp 0. Masukkan keterangan diskon di menu Beri Diskon"*, padahal menu tersebut tidak ada di POS. | Kasir terjebak (deadlock) tidak bisa menyelesaikan transaksi gratis karena mencari menu hantu. |
| **12** | **P2** | Kasir & Owner | `HistoryPage.tsx` | **Tidak Ada Fitur Edit Item Transaksi Pasca-Simpan:** Jika kasir salah memilih varian pomade, satu-satunya cara adalah membatalkan nota dan input ulang dari nol. | Menghambat operasional meja kasir, antrean bertambah panjang saat terjadi koreksi kecil. |
| **13** | **P2** | Owner | `SidebarOwner.tsx` | **Menu "Pengeluaran" Hilang dari Sidebar Owner:** Menu disatukan tersembunyi di dalam tab Laporan Keuangan, padahal pengeluaran operasional dicatat harian. | Navigasi membingungkan Owner saat ingin mencatat biaya operasional mendadak (galon, token). |
| **14** | **P2** | Kasir & Kapster | `CashierPage.tsx` & `KapsterDashboard.tsx` | **Ukuran Stepper Kuantitas Terlalu Kecil (30px x 32px):** Jauh di bawah standar ergonomis sentuh (minimal 44px x 44px). | Sering salah pencet (*miss-tap*) di tablet/smartphone, tombol terlalu rapat saat jari basah. |
| **15** | **P3** | Owner | `ServicesPage.tsx`, `ProductsPage.tsx`, `PayrollPage.tsx` | **Penggunaan Dialog Bawaan Browser (`prompt`, `confirm`, `alert`):** Konfirmasi hapus dan input alasan masih menggunakan dialog abu-abu bawaan browser. | Tampilan tidak profesional, tidak konsisten dengan tema desain, dan rentan diblokir browser tablet. |
| **16** | **P3** | Kapster | `KapsterDashboard.tsx` (baris 194) | **Elemen UI Semu Badge "Pelanggan dalam antrean":** Menampilkan teks antrean tanpa angka urutan dan tidak memiliki daftar giliran kerja yang dapat diakses. | Menimbulkan ekspektasi fitur antrean otomatis, namun ternyata hanya teks statis dekoratif. |

---

## BAGIAN III: ANALISIS KHUSUS UI RUMIT BAGI PEMULA

### 1. Hambatan Kasir Baru (Siti Rahma) pada Alur Checkout POS & Input Manual
1. **Deadlock "Kamera Wajib" pada Kasir POS:** Kasir baru tidak tahu kenapa ia tidak bisa mengklik layanan cukur. Tombol katalog hanya memunculkan tooltip kecil *"Kapster belum absen"*. Pada jam sibuk, meminta kapster meninggalkan kursi potong untuk foto di depan kasir adalah friksi alur kerja yang sangat fatal.
2. **Ketiadaan Input Diskon Nominal Manual Tanpa Kode Promo:** Kasir hanya disediakan input "Kode Diskon". Jika Owner menginstruksikan via telepon memberi potongan Rp 10.000 untuk pelanggan langganan, kasir tidak bisa menginput angka tersebut secara langsung di POS.
3. **Ambiguitas "Rekap Manual / Input Manual" vs "Riwayat Transaksi":** Di sidebar kasir tertulis "Input Manual", tapi di header tertulis "Rekap Manual". Kasir pemula mengira halaman ini tempat melihat rekap total omzet harian.
4. **Form Input Pembayaran Ganda pada Halaman Rekap Manual:** Terdapat input "Uang diterima" di bagian atas dan di bagian summary `<dl>` bawah yang identik, membingungkan kasir.

### 2. Hambatan Kapster (Ferdi / Seva) pada Layar Smartphone Kecil
1. **Hilangnya Transparansi Rincian Komisi di `MySalaryPage.tsx`:** Hanya menampilkan satu angka kumulatif total (misal: Rp 1.400.000). Kapster tidak bisa mencocokkan berapa kepala yang dipotong, pomade yang terjual, atau potongan kasbon.
2. **Ketiadaan Fitur Kalender Izin / Sakit Mandiri:** Hak input izin dicabut dari kapster, dan aturan H-1 menolak izin sakit mendadak.
3. **Keterbacaan dan Target Sentuh pada Antarmuka Seluler:** Scroll horizontal rapat membuat teks komisi terpotong di layar HP sempit (< 380px).

---

## BAGIAN IV: ACTIONABLE ROADMAP (RENCANA AKSI NYATA)

### ⚡ 1. QUICK WINS (Segera Dikerjakan / Usaha Ringan, 1–3 Hari Kerja)
1. **Munculkan Tombol Batal Transaksi (Void) & Pulihkan di `HistoryPage.tsx`:**
   - Tambahkan tombol aksi `<Button className="danger-button" onClick={() => setAction("void")}>Batalkan Transaksi</Button>` pada `TransactionDetailBody` dan modal mobile agar modal `ReasonDialog` aktif.
2. **Perbaiki Sinkronisasi Status Hadir di `OwnerDashboard.tsx` (baris 116):**
   - Ubah logika pencarian status kehadiran dari:
     ```ts
     const masuk = rows.find((r) => r.tipe === "Masuk")
     ```
     Menjadi:
     ```ts
     const masuk = rows.find((r) => r.status === "Hadir" || r.tipe === "Masuk")
     ```
3. **Buka Akses Input Izin / Sakit untuk Hari Ini (Hari H):**
   - Di `IzinKapster.tsx`: ubah batas minimal kalender dari `besokIso` menjadi `hariIniIso`.
   - Di backend `sdm.ts` baris 279: ubah validasi agar mengizinkan `tanggal >= tanggalIso()` untuk status "Sakit" dan "Izin".
4. **Tampilkan Tombol Download & Hapus File di `BackupPage.tsx`:**
   - Di kolom `backup-action-cell`, tambahkan tombol untuk memanggil fungsi `unduh(row.nama)` dan `hapus(row.nama)` yang selama ini tersembunyi.
5. **Bersihkan Duplikasi Input pada Form `ManualPage.tsx`:**
   - Hapus blok input form bayar tunai/QRIS yang terduplikasi di dalam elemen `<dl className="nota-summary">` (baris 671–702).
6. **Ganti Dialog Native Browser (`prompt`/`confirm`) dengan UI Modal Konfirmasi:**
   - Gantikan `window.prompt` dan `window.confirm` pada penghapusan layanan, produk, dan pengeluaran dengan modal kustom tema Eastville.

---

### 🛠️ 2. MAJOR IMPROVEMENTS (Penyederhanaan Alur & Fitur Esensial, 1–2 Minggu Kerja)
1. **Mekanisme Darurat / Override Kasir POS (Bypass Foto Absensi):**
   - Sediakan opsi bagi kasir untuk memilih kapster dengan toggle *"Tandai Hadir Manual (Darurat)"* berizin/berlog audit jika PC kasir tidak memiliki webcam agar transaksi tidak lumpuh.
2. **Implementasi UI Tutup Kasir & Rekonsiliasi Uang Laci Fisik:**
   - Buat modal *"Tutup Shift Kasir"* di halaman Kasir POS yang memanggil endpoint backend `rekap-kasir` dan `tutup-kasir` untuk menghitung selisih fisik uang laci.
3. **Perbaikan Kalkulasi Kembalian & Pembagian Multi-Kapster di Kasir POS:**
   - Perbaiki kalkulasi kembalian tunai pada metode pembayaran Gabungan (Split Bill) agar terhitung dan tercetak jelas di struk thermal.
   - Refactoring logika keranjang kasir (`assignCartToBarber`) agar setiap item belanja bisa ditetapkan ke kapster yang berbeda dalam satu nota transaksi tunggal.
4. **Penyederhanaan dan Transparansi Dasbor Seluler Kapster:**
   - Satukan ringkasan komisi layanan potong rambut dan komisi penjualan produk ke dalam satu halaman "Gaji & Komisi Saya" lengkap dengan rincian per nota.
5. **Peningkatan Ergonomi Target Sentuh (Touch Target Standards):**
   - Perbesar ukuran tombol stepper kuantitas keranjang (+ dan -) dari 30px menjadi minimal 44px x 44px.

---

## RINGKASAN REKOMENDASI UTAMA TIM PENGEMBANG

| Modul Utama | Status Saat Ini | Tindakan yang Dibutuhkan | Estimasi Dampak |
|---|---|---|---|
| **Kasir POS** | Rawan macet jika kapster belum absen; split payment cacat kalkulasi | Tambahkan bypass darurat kapster; perbaiki kalkulasi kembalian split; buat tombol tutup kasir fisik | Menghilangkan 100% risiko antrean kasir terhenti saat peak hour |
| **Riwayat Transaksi** | Fitur pembatalan (void) tidak bisa diakses | Munculkan tombol pemicu modal pembatalan nota yang sudah ada kodenya | Kasir & Owner dapat mengoreksi transaksi salah tanpa bantuan admin database |
| **Owner Dashboard** | Data absensi menampilkan 0 hadir secara salah | Ubah filter pencarian status kehadiran agar cocok dengan format data absensi baru | Akurasi pengawasan operasional oleh Owner kembali normal |
| **Kapster Mobile** | Kaku, akses absensi hilang, komisi tidak transparan | Sediakan rincian pengerjaan per item di menu gaji; izinkan pengajuan sakit di hari H | Meningkatkan moral dan kepercayaan kapster terhadap transparansi sistem |
