# RENCANA KERJA HARIAN: PERBAIKAN SISTEM EASTVILLE BARBER
**Target:** Selesai Hari Ini (Sprint 1 Hari — 2 Developer)  
**Tujuan Utama:** Menutup celah kecurangan uang, perbaiki error menu, dan mempermudah kasir saat antrean ramai.

---

## 👥 PEMBAGIAN TUGAS (2 DEVELOPER)

| Personel | Fokus Tugas | File Terkait | Estimasi Waktu |
|---|---|---|:---:|
| **Developer A** | **Keamanan Uang & Alur Menu (Backend/Core)** | `HistoryPage.tsx`, `App.tsx`, `SidebarManajer.tsx`, `PayrollPage.tsx`, `AttendanceAdminPage.tsx` | **~5,5 Jam** |
| **Developer B** | **Kemudahan Kasir & Tampilan HP (Frontend/UX)** | `CashierPage.tsx`, `ExpensesPage.tsx`, `promoStorage.ts` | **~5,5 Jam** |

---

## 🛠️ TUGAS DEVELOPER A (KEAMANAN & LOGIKA SISTEM)

### 1. Kunci Tombol Batal Transaksi untuk Kasir (Cegah Kecurangan)
- **Masalah:** Saat ini, kasir bisa membatalkan transaksi yang sudah lunas tanpa izin. Kasir nakal bisa mengambil uang tunai pelanggan lalu membatalkan nota.
- **Solusi:** Tombol *"Batalkan Transaksi"* disembunyikan untuk Kasir. Hanya **Manajer & Owner** yang boleh membatalkan transaksi.
- **Lokasi File:** `src/pages/shared/HistoryPage.tsx`
- **Tindakan:** Tambahkan syarat `userRole !== "Kasir"` pada tombol pembatalan.

### 2. Perbaiki Menu Laporan Manajer yang Tertukar & Hilang
- **Masalah:** 
  1. Manajer membuka Laporan Keuangan, tetapi judulnya tertulis *"Sisa Owner"*.
  2. Menu *"Laporan Produk"* hilang dari menu samping (sidebar) Manajer.
- **Solusi:** 
  1. Sambungkan rute manajer ke halaman laporan khusus manajer (bukan owner).
  2. Munculkan kembali menu *"Laporan Produk"* di sidebar Manajer.
- **Lokasi File:** `src/App.tsx` & `src/layouts/sidebars/SidebarManajer.tsx`

### 3. Cegah Kasbon Salah Sasaran
- **Masalah:** Saat mencatat kasbon baru, jika manajer lupa memilih nama kapster, sistem otomatis membebankan hutang ke kapster urutan pertama.
- **Solusi:** Buat pilihan kapster wajib dipilih manual (`-- Pilih Kapster --`). Tombol simpan dinonaktifkan jika belum ada kapster yang dipilih.
- **Lokasi File:** `src/pages/shared/PayrollPage.tsx`

### 4. Simpan Jadwal Libur/Cuti Kapster agar Tidak Hilang Saat Refresh
- **Masalah:** Manajer menginput jadwal libur kapster, tapi begitu halaman di-refresh, datanya hilang semua.
- **Solusi:** Simpan data cuti/libur ke penyimpanan peramban (`localStorage`) agar tetap tersimpan rapi.
- **Lokasi File:** `src/pages/shared/AttendanceAdminPage.tsx`

---

## 🎨 TUGAS DEVELOPER B (KEMUDAHAN KASIR & TAMPILAN)

### 1. Kirim Struk WhatsApp Otomatis ke Nomor Pelanggan
- **Masalah:** Tombol WhatsApp saat ini tidak meminta nomor HP. Kasir harus mencari kontak manual di WhatsApp Web yang memperlambat antrean.
- **Solusi:** Tambahkan kotak ketik nomor HP (contoh: `08123456789`) di layar struk. Sekali klik, langsung membuka obrolan ke nomor pelanggan tersebut.
- **Lokasi File:** `src/pages/shared/CashierPage.tsx`

### 2. Ganti Ikon Pembatalan Pengeluaran yang Membingungkan
- **Masalah:** Tombol untuk membatalkan pengeluaran memakai ikon panah kanan `->`, sehingga staf mengira itu tombol untuk melihat rincian.
- **Solusi:** Ganti menjadi ikon tempat sampah merah dengan tulisan jelas: *"Batal"*.
- **Lokasi File:** `src/pages/shared/ExpensesPage.tsx`

### 3. Peringatan Jelas: Siapa Kapster yang Sedang Dipilih di POS
- **Masalah:** Kasir sering salah klik kapster saat melayani pelanggan yang berbeda di kasir, berakibat salah hitung komisi tukang cukur.
- **Solusi:** Tambahkan penanda visual yang mencolok di atas katalog: *"Sedang input untuk Kapster: [Nama]"*.
- **Lokasi File:** `src/pages/shared/CashierPage.tsx`

### 4. Pastikan Promo Diskon Muncul di Semua Perangkat
- **Masalah:** Diskon event yang dibuat di komputer admin sering tidak muncul di layar kasir.
- **Solusi:** Muat promo standar secara otomatis jika data kasir masih kosong, dan sediakan tombol *"Muat Ulang Promo"*.
- **Lokasi File:** `src/utils/promoStorage.ts` & `src/pages/shared/CashierPage.tsx`

### 5. Panduan Input Pengeluaran Lebih Ramah Pemula
- **Masalah:** Kasir baru bingung apa saja yang harus diisi saat mencatat pengeluaran warung/toko.
- **Solusi:** Berikan teks contoh di kolom isian: *"Contoh: Beli 2 galon air mineral & kopi tim"*.
- **Lokasi File:** `src/pages/shared/ExpensesPage.tsx`

---

## ⏰ JADWAL KERJA HARI INI

```
09.00 - 09.30 | Briefing Pembagian Tugas & Persiapan Code
09.30 - 12.30 | Sesi 1 (Pagi):
                • Dev A: Kunci Batal Transaksi Kasir & Fix Menu Manajer
                • Dev B: Input Nomor WA di Struk & Ganti Ikon Pengeluaran
12.30 - 13.30 | Istirahat Siang
13.30 - 16.30 | Sesi 2 (Siang):
                • Dev A: Fix Form Kasbon & Penyimpanan Cuti Kapster
                • Dev B: Penanda Kapster POS & Sinkronisasi Promo
16.30 - 17.30 | Uji Coba Bersama (Testing Antar Role) & Rilis
```

---

## ✅ CHECKLIST PENGUJIAN AKHIR HARI (CARA MEMASTIKAN BERHASIL)

Sebelum aplikasi diserahkan, lakukan 5 tes cepat ini:

1. **Tes Kasir (Keamanan):**  
   Masuk sebagai akun Kasir -> Buka menu *Riwayat Transaksi* -> Pastikan **tidak ada tombol merah "Batalkan Transaksi"**.
2. **Tes Kasir (WhatsApp):**  
   Selesaikan 1 transaksi kasir -> Di struk, masukkan nomor WA `08123456789` -> Klik tombol *Kirim WA* -> Pastikan tab WhatsApp langsung tertuju ke nomor tersebut.
3. **Tes Manajer (Menu):**  
   Masuk sebagai Manajer -> Buka menu samping -> Pastikan menu *Laporan Produk* ada dan bisa dibuka.
4. **Tes Manajer (Laporan):**  
   Buka *Laporan Keuangan* -> Pastikan tidak ada tulisan "Sisa Owner", melainkan format laba bersih outlet.
5. **Tes Kasbon (Anti Salah Sasaran):**  
   Buka menu *Gaji & Kasbon* -> Klik *Catat Kasbon* -> Jangan pilih nama kapster -> Klik simpan -> Pastikan sistem **menolak** dan meminta memilih nama kapster terlebih dahulu.
