export type Role = "Owner" | "Manajer" | "Kasir" | "Kapster"
export type RoleKey = "owner" | "manajer" | "kasir" | "kapster"
export type RoleType = Role | RoleKey

export interface AppUser {
  id: string
  name: string
  username: string
  role: Role
}

export type Page =
  | "dashboard"
  | "cashier"
  | "history"
  | "manual"
  | "expenses"
  | "payroll"
  | "my-salary"
  | "reports"
  | "product-reports"
  | "team"
  | "services"
  | "products"
  | "attendance"
  | "attendance-admin"
  | "attendance-tim"
  | "audit"
  | "backup"
  | "KasirPOS"
  | "RiwayatTransaksi"
  | "RekapManual"
  | "BerandaManajer"
  | "LaporanKeuangan"
  | "LaporanProduk"
  | "Pengeluaran"
  | "LayananHarga"
  | "MasterProduk"
  | "TimManajer"
  | "GajiKasbon"
  | "AbsensiTim"
  | "BerandaOwner"
  | "TimEastville"
  | "AbsensiAdmin"
  | "JejakAudit"
  | "BackupData"
  | "BerandaKapster"
  | "GajiKomisiSaya"
  | "KomisiProdukSaya"
  | "AbsensiJadwalSaya"

export type IconName =
  | "alert"
  | "arrow"
  | "back"
  | "calendar"
  | "camera"
  | "cash"
  | "cashier"
  | "chart"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "expense"
  | "eye"
  | "file"
  | "history"
  | "home"
  | "lock"
  | "logout"
  | "mail"
  | "menu"
  | "minus"
  | "pencil"
  | "people"
  | "plus"
  | "print"
  | "product"
  | "qris"
  | "receipt"
  | "restore"
  | "search"
  | "settings"
  | "team"
  | "trash"
  | "user"
  | "wallet"
  | "whatsapp"

export const DEMO_USERS: Record<Role, AppUser> = {
  Owner: {
    id: "u-owner",
    name: "Ardi Pradana",
    username: "ardi.owner",
    role: "Owner",
  },
  Manajer: {
    id: "u-manajer",
    name: "Dian Setiawan",
    username: "dian.manajer",
    role: "Manajer",
  },
  Kasir: {
    id: "u-kasir",
    name: "Siti Rahma",
    username: "siti.kasir",
    role: "Kasir",
  },
  Kapster: {
    id: "u-kapster",
    name: "Seva",
    username: "seva.kapster",
    role: "Kapster",
  },
}

export function toRoleKey(role: string): RoleKey {
  const lower = role.toLowerCase()
  if (lower === "owner") return "owner"
  if (lower === "manajer") return "manajer"
  if (lower === "kasir") return "kasir"
  return "kapster"
}

export function normalizeRole(role: string): Role {
  const key = toRoleKey(role)
  if (key === "owner") return "Owner"
  if (key === "manajer") return "Manajer"
  if (key === "kasir") return "Kasir"
  return "Kapster"
}
