# LAPORAN AUDIT UX - EASTVILLE BARBERSHOP

## 1. RINGKASAN EKSEKUTIF
Secara visual dan estetika, Eastville Barbershop memiliki tampilan bernuansa *vintage barbershop modern* yang sangat elegan dan berkelas. Namun, jika dilihat dari kacamata pemilik barbershop awam yang gaptek dan kasir yang harus bekerja cepat saat antrean mengular, aplikasi ini masih terasa seperti **"dibuat oleh programmer untuk programmer"** di beberapa alur vital. Alur transaksi kasir, penamaan menu, dan penanganan kesalahan (error handling) masih menyisakan banyak jebakan kebingungan yang berisiko memperlambat kerja di jam sibuk serta memicu salah pencatatan komisi kapster.

---

## 2. KESAN PERTAMA PER ROLE

| Role | Kesan Pertama | Tingkat Kemudahan | Catatan |
|---|---|---|---|
| **Kasir** (`siti.kasir`) | Tampilan kasir bersih dan menarik, tetapi alur diskon, pemilihan kapster pada produk, dan split bill QRIS-Tunai terasa kaku dan berisiko bikin panik saat antrean ramai. | **Sedang** | Paling kritis karena kasir adalah ujung tombak harian. Tombol "Bayar" sering mati tanpa penjelasan yang jelas jika ada syarat terlewat. |
| **Kapster** (`budi.kapster`) | Sederhana dan fokus pada komisi, tetapi ada istilah aneh seperti *"menunggu konfirmasi klien"* yang mirip aplikasi freelance, serta pemisahan menu komisi produk yang membingungkan. | **Mudah** | Informasi gaji bersih dan kasbon sangat melegakan dan transparan, tetapi kapster tidak bisa melihat rincian nota layanan mana saja yang sudah dikerjakan. |
| **Manajer** (`dian.manajer`) | Begitu login langsung dilempar ke halaman pengaturan *Layanan & Harga*, bukan ke Beranda! Ini sangat mengejutkan dan bikin disorientasi. | **Sedang** | Beranda operasionalnya bagus, namun batasan wewenang dengan Owner terasa kaku tanpa instruksi yang ramah bagi manajer baru. |
| **Owner** (`ardi.owner`) | Kontrol finansial dan analitik bisnis sangat kaya. Namun, banyak istilah teknis seperti *"log hanya-tambah"*, *"sheet tersembunyi"*, dan konfirmasi backup yang terdengar menakutkan bagi pemilik awam. | **Sedang** | Merasa aman dengan adanya jejak audit dan backup, namun butuh panduan bahasa manusia agar tidak ragu saat menekan tombol. |

---

## 3. TEMUAN BERDASARKAN KATEGORI & PEMBAGIAN KERJA (FRONTEND vs BACKEND RANIA vs BACKEND FITRA)

> **Pedoman Berkas Sesuai `CONTRIBUTING.md`:**
> - **Frontend:** Komponen React & styling di `src/`
> - **Backend Rania (`backend/Bisnis.js`):** Area Transaksi (Kasir POS, Riwayat Transaksi, Rekap Manual), Keuangan (Pengeluaran, Laporan Keuangan, Laporan Produk), Katalog (Master Produk, Layanan & Harga), Beranda (Owner, Manajer), dan Backup Data.
> - **Backend Fitra (`backend/Kode.js`):** Area Akun & Keamanan (Login, Token, Lockout), Tim (`Users`), Absensi (Pegawai & Admin), Jejak Audit (`AuditLog`), dan Gaji & Kasbon (`Gaji`, `Kasbon`).

---

### A. ERROR (Masalah Fungsional / Potensi Bug)

#### 🔹 Tugas FRONTEND
1. **Keranjang Tidak Bersih Setelah Transaksi Selesai di Mode Demo** (`CashierPage.tsx` L426):
   - **Masalah:** Di mode demo (yang dipakai latihan kasir baru), saat struk ditutup dengan klik tombol "Kembali", isi keranjang, uang tunai, dan input tidak di-reset (`if (live)` memblokir reset di demo).
   - **Tindakan FE:** Pindahkan pembersihan keranjang (`setCart([])`, `setCash(0)`, `setQris(0)`, `setDiscount(0)`, dsb.) agar dieksekusi di luar blok `if (live)`.
2. **Kalkulasi Pembayaran Gabungan (Split Bill) Asimetris/Pincang** (`CashierPage.tsx` L780 vs L795):
   - **Masalah:** Mengubah nominal Tunai otomatis menyesuaikan QRIS, tetapi mengubah nominal QRIS **tidak** menyesuaikan Tunai sehingga total kurang dan tombol Bayar terkunci.
   - **Tindakan FE:** Pada input `onChange` QRIS, tambahkan auto-adjust: `setCash(Math.max(0, payableTotal - Number(e.target.value.replace(/\D/g, ""))))`.
3. **Dead Click pada Tombol "Atur Jadwal" di Absensi Admin** (`AttendanceAdminPage.tsx` L155 & L173):
   - **Masalah:** Tombol "Atur jadwal" dan tombol jam kerja kapster (Senin–Minggu) bisa diklik tapi tidak memicu aksi atau dialog apa pun.
   - **Tindakan FE:** Sediakan modal interaktif untuk atur jadwal atau berikan status visual disabled jika fitur masih bertahap.

#### 🔸 Tugas BACKEND — RANIA (`backend/Bisnis.js`)
1. **Validasi PIN Otorisasi Diskon Terlalu Terlambat (Late Validation)**:
   - **Masalah:** Saat ini PIN diskon kasir hanya diverifikasi saat action `create-transaksi` dipanggil di tombol checkout akhir. Jika kasir salah memasukkan PIN, transaksi langsung gagal total di detik terakhir di depan pelanggan.
   - **Tindakan BE (Rania):** Di `backend/Bisnis.js`, sediakan endpoint/action baru (misalnya `action: "verifikasi-pin-otorisasi"`). Fungsi ini menerima `pin` dan mengecek apakah PIN tersebut milik Owner atau Manajer yang sah (termasuk counter salah 5x lockout), lalu mengembalikan `ok_()`. Dengan ini, frontend kasir bisa memvalidasi PIN langsung saat pop-up diskon ditekan "Terapkan".

#### 🔸 Tugas BACKEND — FITRA (`backend/Kode.js`)
1. **Koreksi Kehadiran Belum Memiliki Action di Backend**:
   - **Masalah:** Form pengajuan koreksi kehadiran di tab Koreksi pada modul Absensi Tim hanya berupa simulasi lokal (`alert()` browser).
   - **Tindakan BE (Fitra):** Di `backend/Kode.js`, tambahkan case `action: "koreksi-absensi"` pada `doPost`. Simpan perubahan status kehadiran yang disetujui Manajer/Owner ke sheet `Absensi` dan catat ke sheet `AuditLog` menggunakan `handleCatatAudit`.

---

### B. KEJANGGALAN (Inkonsistensi & Perilaku Janggal)

#### 🔹 Tugas FRONTEND
1. **Redirect Login Manajer Salah Sasaran** (`Login.tsx` L50):
   - **Masalah:** Login Manajer langsung melempar user ke `services` (Layanan & Harga), bukan ke `dashboard` (Beranda Manajer).
   - **Tindakan FE:** Ubah `user.role === "Manajer" ? "services" : "dashboard"` menjadi `"dashboard"`.
2. **Penyebutan "Kapster" vs "Capster" Tidak Konsisten**:
   - **Masalah:** Ejaan bercampur antara "Kapster" (POS & sidebar) dan "Capster" (Laporan Produk & Master Produk).
   - **Tindakan FE:** Lakukan replace seluruh teks string UI menjadi baku: **"Kapster"** (dengan huruf K).
3. **Tombol "Kembali ke Beranda" Akses Ditolak Di-hardcode ke Manajer** (`CashierPage.tsx` L390):
   - **Masalah:** Bila Owner atau Kapster mencoba akses POS, tombol kembali selalu memanggil `BerandaManajer`.
   - **Tindakan FE:** Buat dinamis: `onNavigate(currentUser?.role === "Owner" ? "BerandaOwner" : currentUser?.role === "Kapster" ? "BerandaKapster" : "BerandaManajer")`.

#### 🔸 Tugas BACKEND — FITRA (`backend/Kode.js`)
1. **Teks Notifikasi Sukses Absensi Membocorkan Nama Database**:
   - **Masalah:** Di frontend tertulis pesan *"tersimpan di Google Sheets"*. Jika ada pesan sukses balik dari response server di `handleCatatAbsensi`, pastikan pesan kembalian berbunyi netral: *"Absensi berhasil dicatat di sistem."*
2. **Sinkronisasi Identitas Data Pengguna Default**:
   - **Masalah:** Akun demo di `backend/Kode.js` memakai `Budi Santoso` dan `Zhefitra Ananda`, sedangkan frontend lokal memakai nama `Seva` dan `Tata`.
   - **Tindakan BE (Fitra):** Pastikan dokumentasi seed data akun tim di `Kode.js` disinkronkan dengan data akun demo di frontend agar tidak memicu kebingungan nama saat pengujian berganti mode.

---

### C. UX BURUK UNTUK PEMULA (Bikin Pusing & Memperlambat Kerja)

#### 🔹 Tugas FRONTEND
1. **Produk Otomatis Mengikuti "Kapster Aktif" Tanpa Pilihan di Keranjang**:
   - **Masalah:** Penjualan pomade/produk ritel langsung dikaitkan ke kapster yang sedang aktif di picker atas. Kasir tidak bisa memindahkannya tanpa hapus item.
   - **Tindakan FE:** Tambahkan dropdown pemilihan kapster di tiap baris item keranjang belanja (`cart-lines`), sehingga kasir bisa langsung memilih siapa kapster yang merekomendasikan produk tersebut.
2. **Tombol "Bayar" Terkunci (Disabled) Tanpa Indikator Alasan**:
   - **Masalah:** Tombol Bayar mati tanpa penjelasan saat ada syarat yang kurang (uang kurang, alasan gratis belum diisi, dsb.).
   - **Tindakan FE:** Tambahkan helper banner / pesan teks oranye tepat di atas tombol Bayar yang menjelaskan persis mengapa tombol belum aktif (misal: *"Masukkan alasan gratis terlebih dahulu"* atau *"Uang tunai kurang Rp 15.000"*).
3. **Tombol Setelah Selesai Bayar Berlabel "Kembali"**:
   - **Masalah:** Di layar struk, tombol selesai bertuliskan "Kembali", menimbulkan keraguan apakah transaksi tersimpan.
   - **Tindakan FE:** Ubah label tombol menjadi **"Transaksi Baru (Selesai)"** dengan tombol primer yang mencolok.
4. **Menu "Rekap Manual" Membingungkan Pemula**:
   - **Masalah:** Dikira laporan ringkasan berkala, padahal formulir nota kertas offline.
   - **Tindakan FE:** Ganti label menu di sidebar (`SidebarKasir`, `SidebarManajer`, `SidebarOwner`) menjadi **"Input Nota Kertas"** atau **"Transaksi Offline"**.
5. **Kapster Punya Menu "Komisi Produk", Tapi Tidak Ada Rincian Transaksi Layanan**:
   - **Masalah:** Kapster hanya bisa melihat produk ritel yang dijual, sedangkan riwayat potong rambut tidak ada rinciannya.
   - **Tindakan FE:** Sediakan tab rincian layanan pada halaman `GajiKomisiSaya` yang menampilkan daftar pengerjaan potong rambut.
6. **Istilah "Menunggu Konfirmasi Klien" di Beranda Kapster**:
   - **Masalah:** Tidak ada mekanisme konfirmasi pelanggan di barbershop fisik.
   - **Tindakan FE:** Hapus badge tersebut atau ganti teksnya menjadi *"Pelanggan dalam antrean"*.

#### 🔸 Tugas BACKEND — RANIA (`backend/Bisnis.js`)
1. **Penyediaan Rincian Transaksi Layanan di `aktivitas-kapster`**:
   - **Masalah:** Kapster ingin melihat daftar nota layanan apa saja yang sudah dikerjakan hari ini beserta jam dan status lembur/komisinya.
   - **Tindakan BE (Rania):** Pastikan action `aktivitas-kapster` di `backend/Bisnis.js` menyertakan array rincian layanan (invoice ID, jam transaksi, nama layanan, nominal komisi layanan, dan tanda lembur) agar frontend Kapster bisa menampilkan daftar riwayat pengerjaan secara transparan.

---

### D. UI TIDAK RAPI (Tampilan, Tata Letak & Keterbacaan)

#### 🔹 Tugas FRONTEND
1. **Pilihan Cepat Uang Tunai (Quick Cash) Terbatas**:
   - **Masalah:** Pecahan tombol instan hanya Rp 50.000, Rp 100.000, Rp 200.000, dan Uang Pas.
   - **Tindakan FE:** Tambahkan pecahan yang lazim di barbershop (seperti Rp 70.000, Rp 80.000, Rp 150.000) atau buat tombol dinamis berdasarkan pembulatan ke atas terdekat.
2. **Input Uang Tunai Ter-overwrite Saat Item Keranjang Bertambah**:
   - **Masalah:** Efek sinkronisasi otomatis menimpa angka yang sudah diketik kasir ketika item keranjang bertambah.
   - **Tindakan FE:** Buat penanda state `isManualCashInput` agar sistem tidak menimpa angka yang sudah diketik manual oleh kasir.
3. **Banner "Log Hanya-Tambah" Terdengar Terlalu Teknis**:
   - **Masalah:** Terjemahan mentah dari *append-only log*.
   - **Tindakan FE:** Ganti teks menjadi *"Catatan Keamanan Permanen — Seluruh aktivitas tercatat otomatis dan tidak dapat dimanipulasi."*
4. **Kepadatan Tabel Riwayat Transaksi di Layar Tablet Kasir**:
   - **Masalah:** Layout tabel terlalu mepet di layar tablet 10 inci.
   - **Tindakan FE:** Tambahkan breakpoint responsive styling agar baris transaksi menyajikan info lebih lapang pada layar sentuh.
5. **Banner Mode Demo Terlalu Menakutkan**:
   - **Masalah:** Pesan error teknis panjang saat internet putus membuat kasir panik.
   - **Tindakan FE:** Sederhanakan bahasa pesan error di `DemoNotice.tsx` menjadi bahasa operasional awam.

---

## 4. DAFTAR PERBAIKAN PRIORITAS (DENGAN PENANGGUNG JAWAB)

| No | Halaman/Menu | Lokasi (Role) | Masalah | Dampak | Prioritas | Usulan Perbaikan | Penanggung Jawab | Tipe |
|---|---|---|---|---|---|---|---|---|
| 1 | **Login** | Manajer | Login diarahkan ke `services` (Layanan & Harga). | Disorientasi, manajer bingung mencari ringkasan omzet harian. | **KRITIS** | Ubah `targetPage` manajer di `Login.tsx` menjadi `"dashboard"`. | **FRONTEND** | Flow |
| 2 | **Kasir POS** | Kasir | Pemilihan produk otomatis memakai kapster aktif tanpa opsi ganti di keranjang. | Salah hitung komisi kapster, kasir frustrasi harus hapus & input ulang. | **KRITIS** | Tambahkan dropdown kapster pada setiap baris item keranjang belanja. | **FRONTEND** | UX / Flow |
| 3 | **Kasir POS** | Kasir | Sinkronisasi split-bill (Gabungan) satu arah; ubah QRIS tidak mengubah Tunai. | Kasir salah hitung kembalian / tombol Bayar terkunci saat antre. | **KRITIS** | Buat `onChange` input QRIS otomatis memperbarui `cash = Math.max(0, payableTotal - qrisVal)`. | **FRONTEND** | Flow / Bug |
| 4 | **Kasir POS** | Kasir | Tombol "Bayar" terkunci tanpa pesan keterangan saat syarat kurang. | Kasir mengira layar hang saat ada field (seperti alasan diskon/gratis) belum terisi. | **TINGGI** | Tampilkan teks bantuan di atas tombol Bayar (misal: *"Alasan gratis wajib diisi"* atau *"Uang kurang Rp X"*). | **FRONTEND** | UX / UI |
| 5 | **Struk POS** | Kasir | Tombol selesai bayar berlabel "Kembali" & keranjang demo tidak bersih. | Mengira transaksi batal; di sesi training keranjang tidak kosong. | **TINGGI** | Ganti label tombol jadi **"Transaksi Baru (Selesai)"**, dan pastikan keranjang di-reset di semua mode. | **FRONTEND** | Copy / Flow |
| 6 | **Diskon POS** | Kasir | PIN otorisasi diskon baru dicek saat checkout akhir di server. | Kasir malu di depan pelanggan karena transaksi ditolak di detik terakhir. | **TINGGI** | Rania buat endpoint `verifikasi-pin-otorisasi` di `Bisnis.js`; Frontend panggil saat klik "Terapkan Diskon". | **BE (Rania) + FE** | Security / Flow |
| 7 | **Rekap Manual** | Semua Role | Nama menu *"Rekap Manual"* dikira laporan ringkasan, bukan input nota kertas. | Kasir tidak tahu ke mana harus mencatat nota saat internet padam. | **SEDANG** | Ubah nama menu di sidebar menjadi **"Input Nota Kertas"** atau **"Transaksi Offline"**. | **FRONTEND** | Copy / Navigasi |
| 8 | **Beranda** | Kapster | Terdapat teks *"Menunggu konfirmasi klien"* pada progress bar shift. | Membingungkan kapster karena tidak ada fitur konfirmasi pelanggan di barbershop. | **SEDANG** | Ganti teks menjadi *"Pelanggan dalam antrean"* atau cukup tampilkan persentase target harian. | **FRONTEND** | Copy |
| 9 | **Laporan** | Semua Role | Ejaan *"Capster"* dan *"Kapster"* bercampur aduk. | Terlihat tidak konsisten dan kurang rapi secara profesional. | **SEDANG** | Standarkan seluruh istilah di UI menjadi **"Kapster"** (dengan huruf K). | **FRONTEND** | Copy |
| 10 | **Absensi Mandiri** | Kapster | Pesan sukses menyebutkan *"tersimpan di Google Sheets"*. | Terkesan amatir dan membocorkan arsitektur teknis backend. | **RENDAH** | Ubah teks respon di frontend/backend menjadi *"Absensi berhasil dicatat di sistem."* | **FE + BE (Fitra)** | Copy |
| 11 | **Jejak Audit** | Owner | Menggunakan frasa *"Log hanya-tambah"*. | Istilah asing yang membingungkan bagi pemilik toko non-IT. | **RENDAH** | Ubah menjadi *"Catatan Keamanan Permanen (Tidak dapat dimanipulasi)"*. | **FRONTEND** | Copy |
| 12 | **Absensi Admin** | Manajer, Owner | Fitur koreksi absensi belum tersambung ke backend dan jadwal shift belum interaktif. | Fitur terasa separuh jalan / dummy. | **RENDAH** | Fitra buat action `koreksi-absensi` di `Kode.js`; Frontend buat modal jadwal & koreksi absensi. | **BE (Fitra) + FE** | UI / Flow |

---

## 5. QUICK WINS (Perbaikan Cepat, Dampak Besar, Usaha Kecil)

1. **[Frontend] Ubah Target Landing Login Manajer**:
   - Ganti satu baris di `src/components/common/Login.tsx` dari `user.role === "Manajer" ? "services"` menjadi `"dashboard"`. Manajer langsung disambut oleh ringkasan omzet dan absensi hari ini.
2. **[Frontend] Ganti Tombol "Kembali" pada Layar Struk Menjadi "Transaksi Baru"**:
   - Ubah teks dan ikon pada `ReceiptView` di `src/pages/shared/CashierPage.tsx` menjadi `Transaksi Baru` dengan warna tombol yang jelas. Kasir langsung paham bahwa transaksi sudah tuntas dan siap melayani antrean berikutnya.
3. **[Frontend] Perbaiki Auto-Calculate Pembayaran QRIS pada Split Bill**:
   - Di `src/pages/shared/CashierPage.tsx`, tambahkan logika agar saat kasir mengetik nominal QRIS, sisa nominal tunai langsung disesuaikan otomatis (`setCash(payableTotal - qris)`).
4. **[Frontend] Ubah Label Menu "Rekap Manual" di Seluruh Sidebar**:
   - Ganti label menu `Rekap Manual` menjadi **"Input Nota Kertas"** di `SidebarKasir.tsx`, `SidebarManajer.tsx`, dan `SidebarOwner.tsx`. Pemula langsung mengerti fungsinya tanpa harus membaca petunjuk.
5. **[Frontend] Seragamkan Kata "Capster" Menjadi "Kapster"**:
   - Lakukan penggantian teks pada `ProductReportsPage.tsx` dan `ProductsPage.tsx` agar tidak ada lagi kata "Capster" dengan ejaan Inggris yang janggal di tengah teks bahasa Indonesia.

---

## 6. SARAN UNTUK PEMULA

> *"Kalau saya baru pertama kali jadi kasir atau pemilik barbershop di sini, bagian mana yang paling bikin kaget atau bingung? Dan apa saran simpelnya?"*

**Yang paling bikin kaget:**
1. **Bagi Kasir:** Ketika ada promo diskon atau pelanggan langganan yang digratiskan cukurnya. Kasir sudah senang menekan diskon 100%, tapi tombol **"Bayar" mendadak mati (berwarna redup dan tidak bisa diklik)**. Kasir panik karena pelanggan sudah berdiri di depan meja kasir, padahal masalahnya sepele: sistem diam-diam mewajibkan kolom *"Alasan gratis"* diisi, tanpa ada tanda bintang merah atau tulisan peringatan warna merah di samping tombol Bayar.
2. **Bagi Owner Awam:** Saat membuka menu **"Jejak Audit"** dan **"Backup Data"**. Begitu membaca kalimat *"Log hanya-tambah"* dan *"Disimpan sebagai sheet tersembunyi"*, pemilik barbershop yang tidak paham komputer akan takut menyentuh menu tersebut karena terdengar seperti menu koding yang kalau salah klik bisa merusak sistem.

**Saran simpel agar ramah pemula:**
- **Beri petunjuk visual saat tombol mati:** Jangan pernah membiarkan tombol penting dalam keadaan mati (`disabled`) tanpa teks penjelasan di dekatnya. Cukup beri teks kecil berwarna oranye: *"Isi alasan gratis terlebih dahulu"* atau *"Jumlah uang masih kurang Rp 10.000"*.
- **Gunakan analogi meja kasir nyata:** Gantilah istilah koding dengan istilah fisik barbershop. Daripada menyebut "Rekap Manual", sebutlah "Buku Nota Cadangan". Daripada menyebut "Log Audit", sebutlah "Buku Harian Aktivitas".

---

## 7. REKOMENDASI AKSI SESUAI PEMBAGIAN KERJA

Berikut pembagian eksekusi yang aman agar tidak terjadi bentrok kode sesuai `CONTRIBUTING.md`:

1. **Jalur Frontend (Aman dikerjakan langsung di React):**
   - Perbaiki sinkronisasi dua arah pembayaran split-bill QRIS-Tunai di `CashierPage.tsx`.
   - Berikan teks indikator penyebab tombol Bayar nonaktif saat ada syarat yang kurang.
   - Sediakan opsi kapster per item di baris keranjang belanja kasir.
   - Ganti rute login Manajer di `Login.tsx` menjadi `"dashboard"`.
   - Ganti label "Rekap Manual" menjadi "Input Nota Kertas" di ketiga file sidebar.
2. **Jalur Backend Fitra (`backend/Kode.js` - Branch `fitra`):**
   - Tambahkan case `koreksi-absensi` pada `Kode.js` untuk mencatat status persetujuan koreksi absensi tim ke sheet `Absensi` dan `AuditLog`.
   - Pastikan response pesan sukses absensi ramah pemula (*"Absensi berhasil dicatat di sistem"*).
3. **Jalur Backend Rania (`backend/Bisnis.js` - Komunikasi dengan Rania):**
   - Mintakan Rania menambahkan action `verifikasi-pin-otorisasi` di `backend/Bisnis.js` agar validasi PIN diskon tidak menunggu tombol Bayar akhir.
   - Mintakan Rania menyertakan rincian daftar nota layanan di response action `aktivitas-kapster`.
