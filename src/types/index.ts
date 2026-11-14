export type Role = "Owner" | "Kasir" | "Kapster"
export type RoleKey = "owner" | "kasir" | "kapster"
export type RoleType = Role | RoleKey

export interface AppUser {
  id: string
  name: string
  username: string
  role: Role
}

export type AbsensiStatus = "Hadir" | "Izin" | "Sakit" | "Cuti" | "Tidak Hadir"

export type Page = "dashboard" | "cashier" | "history" | "manual" | "expenses" | "payroll" | "my-salary" | "reports" | "product-reports" | "team" | "services" | "products" | "attendance" | "attendance-admin" | "attendance-tim" | "attendance-history" | "audit" | "backup" | "KasirPOS" | "RiwayatTransaksi" | "RekapManual" | "LaporanKeuangan" | "LaporanProduk" | "Pengeluaran" | "catalog" | "KatalogLayananProduk" | "LayananHarga" | "MasterProduk" | "GajiKasbon" | "AbsensiTim" | "BerandaOwner" | "TimEastville" | "AbsensiAdmin" | "JejakAudit" | "BackupData" | "BerandaKapster" | "GajiKomisiSaya" | "KomisiProdukSaya" | "AbsensiJadwalSaya" | "AbsensiKapster" | "KasbonKapster" | "kasbon-kapster" | "IzinKapster" | "izin-kapster" | "RiwayatAbsensi" | "JadwalAbsensi"

export type IconName = "alert" | "arrow" | "back" | "calendar" | "camera" | "cash" | "cashier" | "chart" | "check" | "chevron" | "clock" | "close" | "expense" | "eye" | "file" | "history" | "home" | "lock" | "logout" | "mail" | "menu" | "minus" | "pencil" | "people" | "plus" | "print" | "product" | "qris" | "receipt" | "restore" | "search" | "settings" | "team" | "trash" | "user" | "wallet" | "whatsapp"

export const DEMO_USERS: Record<Role, AppUser> = {
  Owner: {
    id: "u-owner",
    name: "Ardi Pradana",
    username: "owner",
    role: "Owner",
  },
  Kasir: {
    id: "u-kasir",
    name: "Siti Rahma",
    username: "kasir",
    role: "Kasir",
  },
  Kapster: {
    id: "u-kapster",
    name: "Ferdi",
    username: "ferdi",
    role: "Kapster",
  },
}

export function toRoleKey(role: string): RoleKey {
  const lower = role.toLowerCase()
  if (lower === "owner") return "owner"
  if (lower === "kasir") return "kasir"
  return "kapster"
}

export function normalizeRole(role: string): Role {
  const key = toRoleKey(role)
  if (key === "owner") return "Owner"
  if (key === "kasir") return "Kasir"
  return "Kapster"
}
