# Eastville Barbershop - Panduan Setup Backend Login

## Apa yang Dibutuhkan
- Akun Google (Gmail)
- Browser (Chrome recommended)

---

## Langkah 1: Buat Google Sheets

1. Buka https://sheets.google.com
2. Klik **"+ Blank"** untuk buat spreadsheet baru
3. Beri nama: **"Eastville Database"**
4. **Catat ID Spreadsheet** dari URL-nya:
   ```
   https://docs.google.com/spreadsheets/d/[ID_INI_YANG_DICATAT]/edit
   ```
   Contoh: kalau URL-nya `https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkL/edit`
   maka ID-nya adalah `1aBcDeFgHiJkL`

---

## Langkah 2: Buat Google Apps Script

1. Buka https://script.google.com
2. Klik **"Project Baru"** (atau "New Project")
3. Hapus semua kode default di editor
4. Copy-paste **seluruh isi** file `backend/Code.gs` ke editor
5. Ganti baris ini:
   ```javascript
   var SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_KAMU";
   ```
   dengan ID yang kamu catat di Langkah 1, contoh:
   ```javascript
   var SPREADSHEET_ID = "1aBcDeFgHiJkL";
   ```
6. Klik **Ctrl+S** untuk save, beri nama project: **"Eastville Backend"**

---

## Langkah 3: Jalankan Setup (Buat Sheet + Data Awal)

1. Di editor Apps Script, klik dropdown fungsi di toolbar atas
2. Pilih fungsi **`setupSheets`**
3. Klik tombol **Run** (ikon play ▶)
4. Pertama kali akan minta **izin akses** - klik:
   - "Review permissions"
   - Pilih akun Google kamu
   - Klik "Advanced" > "Go to Eastville Backend (unsafe)"
   - Klik "Allow"
5. Tunggu sampai selesai (lihat di Execution Log bawah)
6. Buka Google Sheets kamu, seharusnya sudah ada 3 sheet:
   - **Users** (4 akun demo sudah terisi)
   - **Sessions** (kosong, header saja)
   - **AuditLog** (kosong, header saja)

---

## Langkah 4: Deploy sebagai Web App

1. Di editor Apps Script, klik **Deploy** > **New deployment**
2. Klik ikon gear ⚙ di samping "Select type", pilih **"Web app"**
3. Isi:
   - **Description**: "Eastville Login API v1"
   - **Execute as**: "Me" (akun kamu)
   - **Who has access**: "Anyone" (agar bisa diakses dari frontend)
4. Klik **Deploy**
5. **Catat URL** yang muncul (Web app URL), contoh:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

## Langkah 5: Test Backend

1. Buka file `backend/test-login.html` di browser (double-click atau drag ke browser)
2. Paste URL API dari Langkah 4 ke kolom input URL
3. Klik **"Test Koneksi"** - harusnya muncul response JSON sukses
4. Coba login dengan akun demo:
   - Username: `ardi.owner`
   - PIN: `123456`
5. Klik **"Login"** - harusnya muncul response dengan token

---

## Akun Demo

| Role    | Nama           | Username      | PIN    | Email              |
|---------|----------------|---------------|--------|--------------------|
| Owner   | Ardi Pradana   | ardi.owner    | 123456 | ardi@eastville.id  |
| Manajer | Dian Setiawan  | dian.manajer  | 123456 | dian@eastville.id  |
| Kasir   | Siti Rahma     | siti.kasir    | 123456 | siti@eastville.id  |
| Kapster | Budi Santoso   | budi.kapster  | 123456 | budi@eastville.id  |

---

## Struktur Google Sheets

### Sheet: Users
| Kolom     | Isi                              |
|-----------|----------------------------------|
| id        | ID unik user (u-owner, dll)      |
| nama      | Nama lengkap                     |
| username  | Username untuk login             |
| pin_hash  | PIN yang sudah di-hash (SHA-256) |
| role      | Owner / Manajer / Kasir / Kapster|
| cabang    | Cabang user                      |
| email     | Email untuk reset PIN            |
| status    | Aktif / Nonaktif                 |
| dibuat    | Tanggal dibuat                   |

### Sheet: Sessions
| Kolom       | Isi                        |
|-------------|----------------------------|
| token       | Token session (64 karakter)|
| user_id     | ID user yang login         |
| login_time  | Waktu login                |
| expire_time | Waktu kadaluarsa (8 jam)   |
| status      | Aktif / Logout             |

### Sheet: AuditLog
| Kolom     | Isi                              |
|-----------|----------------------------------|
| waktu     | Timestamp kejadian               |
| user_id   | ID user                          |
| nama_user | Nama user                        |
| aksi      | LOGIN / LOGOUT / RESET_PIN / dll |
| detail    | Keterangan detail                |
| alasan    | Alasan (jika ada)                |

---

## API Endpoints

Semua request POST dikirim ke URL yang sama, dibedakan oleh field `action`:

### Login
```json
POST { "action": "login", "username": "ardi.owner", "pin": "123456" }
```

### Logout
```json
POST { "action": "logout", "token": "token_dari_login" }
```

### Verifikasi Session
```json
POST { "action": "verify-session", "token": "token_dari_login" }
```

### Lupa PIN
```json
POST { "action": "forgot-pin", "email": "ardi@eastville.id" }
```

### Reset PIN
```json
POST { "action": "reset-pin", "email": "ardi@eastville.id", "newPin": "654321" }
```

---

## Catatan Penting

- **PIN disimpan dalam bentuk hash** (SHA-256), jadi tidak bisa dilihat langsung di sheet
- **Session berlaku 8 jam**, setelah itu harus login lagi
- **Setiap aktivitas dicatat** di sheet AuditLog
- Kalau mau **update kode** setelah deploy, harus deploy ulang:
  Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy
- Google Apps Script punya **batas quota** (gratis):
  - 90 menit total runtime per hari
  - 20.000 URL fetch per hari
  - Cukup untuk project sekolah
