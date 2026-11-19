# Rencana Implementasi: Pindah Absensi dari Kapster ke Kasir (PIN Kapster)

Tujuan: pindahkan fitur absensi dari role Kapster ke role Kasir. Kasir buka menu Absensi baru, pilih kapster, masukkan PIN kapster terlebih dahulu (mencegah absen titip), lalu pilih status Hadir / Izin / Sakit / Cuti. Kapster yang tidak mengisi absen pada suatu tanggal dianggap "Tidak Hadir".

## Keputusan desain (disetujui / direkomendasikan)

1. **PIN = PIN Kapster (Opsi B, disetujui user).** Saat Kasir memilih kapster, harus memasukkan PIN kapster dan diverifikasi ke server sebelum status absensi disimpan. Butuh aksi backend baru (verifikasi PIN kapster).
2. **Model data: status harian per kapster per tanggal.** Satu baris per kapster per tanggal dengan status `Hadir | Izin | Sakit | Cuti`. "Tidak Hadir" adalah turunan (ditampilkan bila tidak ada baris untuk kapster tersebut pada tanggal itu), bukan baris yang ditulis server. Tidak perlu cron backend.
3. **Lepas absensi dari Kapster.** Hapus entri `AbsensiJadwalSaya` dari sidebar Kapster dan rute App.tsx role Kapster (pindah ke Kasir). Berkas `src/pages/kapster/AbsensiJadwalSaya.tsx` dan `shared/AttendancePage.tsx` dipertahankan (tidak merusak), hanya tidak lagi dirujuk dari Kapster.
4. **Backend (prasyarat, di luar scope frontend ini):**
   - Aksi baru `verifikasi-pin-kapster` (role Kasir): terima `{targetUserId, pin}`, verifikasi hash PIN kapster, 6 digit, berlaku lockout 5x sama seperti login.
   - Aksi baru `catat-absensi-kapster` (role Kasir): terima `{targetUserId, tanggal, status, catatan}`; tulis baris Absensi dengan `status` tersebut; audit log siapa (Kasir) yang mencatat untuk siapa kapster.
   - `list-absensi` sudah ada dan bisa difilter `userId` + `tanggal`; Kasir boleh dipanggil (perlu ditambahkan ke daftar role yang boleh di Kode.js bila saat ini hanya Kapster/Owner/Manajer).
   - Kolom `status` di sheet Absensi kini berisi `Hadir | Izin | Sakit | Cuti` (selain lama `Masuk`/`Pulang` dari AttendancePage lama).

## Tugas implementasi (frontend)

1. **types/index.ts:** tambah tipe status absensi (`"Hadir" | "Izin" | "Sakit" | "Cuti" | "Tidak Hadir"`), tambah page `"AbsensiKapster"` ke union `Page`, tambah entri `PAGE_TITLE_MAP` di AppLayout (`AbsensiKapster`: "Absensi Kapster").
2. **api.ts:** tambah `apiAbsensiKapster` (atau perpanjang `apiAbsensi`) dengan `verifikasiPinKapster(targetUserId, pin)` → `verifikasi-pin-kapster` dan `catatAbsensiKapster({targetUserId, tanggal, status, catatan})` → `catat-absensi-kapster`. Ganti tipe `AbsensiRow.tipe` supaya tetap kompatibel, atau gunakan tipe baru.
3. **src/pages/kasir/AbsensiKapster.tsx (baru):** halaman absensi kasir.
   - Pemilih tanggal (default hari ini).
   - Daftar kapster dari `apiKasir.kapster()` dengan status untuk tanggal terpilih (dari `apiAbsensi.list({tanggal})`); kapster tanpa entri ditampilkan sebagai "Tidak Hadir".
   - Ketuk kapster → modal PIN (masukkan PIN kapster, verifikasi via `verifikasiPinKapster`); gagal → tampilkan error, tidak bisa lanjut.
   - Setelah PIN valid → pilih status `Hadir / Izin / Sakit / Cuti` + catatan opsional → `catatAbsensiKapster` → refresh daftar; notifikasi sukses.
   - Audit trail: catat Kasir sebagai pencatat.
4. **src/layouts/sidebars/SidebarKasir.tsx:** tambah item menu Absensi (group baru atau di TRANSAKSI/UTAMA), page `AbsensiKapster`, alias `absensi-kapster`, icon `calendar` atau `clock`.
5. **src/App.tsx:** tambah rute kasir untuk `AbsensiKapster` / `absensi-kapster` (render `AbsensiKapster` page). Pastikan role-denied di `CashierPage` tidak mengganggu (halaman absensi bukan KasirPOS, tidak perlu role-denied; biar diakses Kasir).
6. **src/layouts/AppLayout.tsx:** `PAGE_TITLE_MAP` entri baru.
7. **Validasi:** `pnpm build` (typecheck via Vite) dan `pnpm format` (oxfmt). Tidak ada unit test di repo.

## Risiko / catatan

- Backend belum ada aksi `verifikasi-pin-kapster` dan `catat-absensi-kapster`; frontend akan gagal runtime bila backend belum di-deploy. Tandai sebagai prasyarat.
- `list-users` (apiTim.list) dibatasi Owner/Manajer di backend, jadi daftar kapster diambil dari `apiKasir.kapster()` (boleh Kasir).
- Status lama (`Masuk`/`Pulang` dari AttendancePage kapster) dan status baru (`Hadir`/`Izin`/`Sakit`/`Cuti`) coexist di sheet Absensi; pastikan tampilan kasir filter hanya status baru atau tangani keduanya dengan aman.

## Validasi selesai

- `pnpm build` lolos tanpa error TS.
- `pnpm format` tidak merusak formatting.
- (Manual) Kasir login, buka Absensi, pilih kapster, masukkan PIN kapster, pilih Hadir/Izin/Sakit/Cuti, simpan, muncul di daftar; kapster tanpa entri tampil "Tidak Hadir".
