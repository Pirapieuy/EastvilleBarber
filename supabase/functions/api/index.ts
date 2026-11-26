// Satu pintu masuk untuk semua aksi, bentuk permintaan/respons sama dengan Apps Script:
// POST {action, token, ...} -> {success, data | error, code}.
import { ApiError, gagal, penggunaDariToken, type Role } from "./util.ts"
import { login, logout, verifySession } from "./handlers/auth.ts"
import { createUser, deleteUser, forgotPin, listUsers, resetPin, toggleUserStatus, updateUser } from "./handlers/user.ts"
import { createLayanan, toggleLayanan, updateLayanan } from "./handlers/layananLama.ts"
import {
  getPengaturanAksi, hapusLayanan, listKapster, listLayanan, listProduk, setKomisiKapster, simpanLayanan, simpanPengaturan,
} from "./handlers/katalog.ts"
import { adjustStok, hapusProduk, logProduk, simpanProduk } from "./handlers/produk.ts"
import {
  cekKodeKasir, hapusKodeDiskon, listKodeDiskon, simpanKodeDiskon, verifikasiPinOtorisasi,
} from "./handlers/diskon.ts"
import {
  aktifkanPengeluaran, batalkanPengeluaran, batalkanTransaksi, createPengeluaran, createTransaksi,
  createTransaksiManual, listKomisi, listPengeluaran, listTransaksi, pulihkanTransaksi, updatePengeluaran, updateTransaksi,
} from "./handlers/transaksi.ts"
import {
  aktivitasKapster, laporanKeuangan, laporanProduk, listTutupKasir, rekapKasir, tutupKasir,
} from "./handlers/laporan.ts"
import {
  bayarGaji, catatAbsensi, catatAbsensiKapster, createKasbon, hitungGaji, keputusanKasbon, koreksiAbsensi,
  listAbsensi, listAudit, listGaji, listKasbon, lunasiKasbon, ringkasanLaporan, verifikasiPinKapster,
} from "./handlers/sdm.ts"
import { backupBuat, backupHapus, backupList, backupPulihkan, backupUnduh } from "./handlers/backup.ts"

// deno-lint-ignore no-explicit-any
type Handler = (body: any) => Promise<unknown>
// deno-lint-ignore no-explicit-any
type HandlerUser = (body: any, user: any) => Promise<unknown>

// Aksi yang menangani otentikasi sendiri (padanan switch di doPost, Kode.js).
const rute: Record<string, Handler> = {
  login, logout, "verify-session": verifySession, "forgot-pin": forgotPin, "reset-pin": resetPin,
  "list-users": listUsers, "create-user": createUser, "update-user": updateUser, "toggle-user-status": toggleUserStatus,
  "delete-user": deleteUser,
  "create-layanan": createLayanan, "update-layanan": updateLayanan, "toggle-layanan": toggleLayanan,
  "list-kasbon": listKasbon, "create-kasbon": createKasbon, "lunasi-kasbon": lunasiKasbon,
  "setujui-kasbon": (b) => keputusanKasbon(b, "Aktif"), "tolak-kasbon": (b) => keputusanKasbon(b, "Ditolak"),
  "hitung-gaji": hitungGaji, "bayar-gaji": bayarGaji, "list-gaji": listGaji,
  "ringkasan-laporan": ringkasanLaporan,
  "catat-absensi": catatAbsensi, "list-absensi": listAbsensi, "koreksi-absensi": koreksiAbsensi,
  "verifikasi-pin-kapster": verifikasiPinKapster, "catat-absensi-kapster": catatAbsensiKapster,
  "list-audit": listAudit,
}

// Aksi bisnis: hak akses per peran (salinan AKSES di Bisnis.js).
const bisnis: Record<string, { role: Role[]; fn: HandlerUser }> = {
  "list-layanan": { role: ["Owner", "Kasir", "Kapster"], fn: () => listLayanan() },
  "list-produk": { role: ["Owner", "Kasir", "Kapster"], fn: () => listProduk() },
  "list-kapster": { role: ["Owner", "Kasir"], fn: () => listKapster() },
  "create-transaksi": { role: ["Kasir"], fn: createTransaksi },
  "list-transaksi": { role: ["Owner", "Kasir"], fn: listTransaksi },
  "batalkan-transaksi": { role: ["Owner", "Kasir"], fn: batalkanTransaksi },
  "pulihkan-transaksi": { role: ["Owner"], fn: pulihkanTransaksi },
  "update-transaksi": { role: ["Owner", "Kasir"], fn: updateTransaksi },
  "list-pengeluaran": { role: ["Owner"], fn: () => listPengeluaran() },
  "create-pengeluaran": { role: ["Owner"], fn: createPengeluaran },
  "batalkan-pengeluaran": { role: ["Owner"], fn: batalkanPengeluaran },
  "aktifkan-pengeluaran": { role: ["Owner"], fn: aktifkanPengeluaran },
  "update-pengeluaran": { role: ["Owner"], fn: updatePengeluaran },
  "simpan-produk": { role: ["Owner"], fn: simpanProduk },
  "hapus-produk": { role: ["Owner"], fn: hapusProduk },
  "adjust-stok": { role: ["Owner"], fn: adjustStok },
  "log-produk": { role: ["Owner"], fn: () => logProduk() },
  "get-pengaturan": { role: ["Owner"], fn: () => getPengaturanAksi() },
  "simpan-pengaturan": { role: ["Owner"], fn: simpanPengaturan },
  "set-komisi-kapster": { role: ["Owner"], fn: setKomisiKapster },
  "list-komisi": { role: ["Owner", "Kapster"], fn: listKomisi },
  "simpan-layanan": { role: ["Owner"], fn: simpanLayanan },
  "hapus-layanan": { role: ["Owner"], fn: hapusLayanan },
  "create-transaksi-manual": { role: ["Owner", "Kasir"], fn: createTransaksiManual },
  "rekap-kasir": { role: ["Kasir"], fn: rekapKasir },
  "tutup-kasir": { role: ["Kasir"], fn: tutupKasir },
  "list-tutup-kasir": { role: ["Owner", "Kasir"], fn: listTutupKasir },
  "verifikasi-pin-otorisasi": { role: ["Kasir"], fn: verifikasiPinOtorisasi },
  "list-kode-diskon": { role: ["Owner"], fn: () => listKodeDiskon() },
  "cek-kode-diskon": { role: ["Kasir"], fn: cekKodeKasir },
  "simpan-kode-diskon": { role: ["Owner"], fn: simpanKodeDiskon },
  "hapus-kode-diskon": { role: ["Owner"], fn: hapusKodeDiskon },
  "laporan-keuangan": { role: ["Owner"], fn: laporanKeuangan },
  "laporan-produk": { role: ["Owner", "Kapster"], fn: laporanProduk },
  "aktivitas-kapster": { role: ["Kapster"], fn: aktivitasKapster },
  "backup-buat": { role: ["Owner"], fn: backupBuat },
  "backup-list": { role: ["Owner"], fn: () => backupList() },
  "backup-pulihkan": { role: ["Owner"], fn: backupPulihkan },
  "backup-hapus": { role: ["Owner"], fn: backupHapus },
  "backup-unduh": { role: ["Owner"], fn: backupUnduh },
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
const balas = (o: unknown) =>
  new Response(JSON.stringify(o), { headers: { ...CORS, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method === "GET") return balas({ success: true, message: "Eastville Barbershop API aktif (Supabase)" })
  try {
    const body = JSON.parse(await req.text())
    const aksi = String(body.action)
    if (rute[aksi]) return balas(await rute[aksi](body))
    const b = bisnis[aksi]
    if (!b) return balas(gagal("Aksi tidak dikenal: " + aksi))
    const user = await penggunaDariToken(String(body.token ?? "").trim())
    if (!user || user.status !== "Aktif") return balas(gagal("Session tidak valid. Silakan login lagi.", "UNAUTHORIZED"))
    if (!b.role.includes(user.role))
      return balas(gagal(`Peran ${user.role} tidak boleh melakukan aksi ini.`, "FORBIDDEN"))
    return balas(await b.fn(body, user))
  } catch (e) {
    if (e instanceof ApiError) return balas(gagal(e.message, e.code))
    console.error(e)
    return balas(gagal("Terjadi kesalahan server: " + (e as Error).message))
  }
})
