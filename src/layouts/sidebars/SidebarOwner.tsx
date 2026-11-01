import { BaseSidebar, SidebarNavGroup, SidebarProps } from "./BaseSidebar"

const OWNER_GROUPS: SidebarNavGroup[] = [
  {
    id: "utama",
    title: "UTAMA",
    items: [
      {
        page: "BerandaOwner",
        alias: "dashboard",
        label: "Beranda",
        icon: "home",
      },
    ],
  },
  {
    id: "laporan-keuangan",
    title: "LAPORAN & KEUANGAN",
    items: [
      {
        page: "RiwayatTransaksi",
        alias: "history",
        label: "Riwayat Transaksi",
        icon: "history",
      },
      {
        page: "LaporanKeuangan",
        alias: "reports",
        label: "Laporan Keuangan",
        icon: "chart",
      },
      {
        page: "LaporanProduk",
        alias: "product-reports",
        label: "Laporan Produk",
        icon: "product",
      },
      {
        page: "Pengeluaran",
        alias: "expenses",
        label: "Pengeluaran",
        icon: "expense",
      },
      {
        page: "RekapManual",
        alias: "manual",
        label: "Rekap Manual",
        icon: "pencil",
      },
    ],
  },
  {
    id: "katalog-karyawan",
    title: "KATALOG & KARYAWAN",
    items: [
      {
        page: "LayananHarga",
        alias: "services",
        label: "Layanan & Harga",
        icon: "settings",
      },
      {
        page: "MasterProduk",
        alias: "products",
        label: "Master Produk",
        icon: "product",
      },
      {
        page: "TimEastville",
        alias: "team",
        label: "Tim Eastville",
        icon: "team",
      },
      {
        page: "GajiKasbon",
        alias: "payroll",
        label: "Gaji & Kasbon",
        icon: "wallet",
      },
      {
        page: "AbsensiAdmin",
        alias: "attendance-admin",
        label: "Absensi Admin",
        icon: "calendar",
      },
    ],
  },
  {
    id: "sistem-keamanan",
    title: "SISTEM & KEAMANAN",
    items: [
      {
        page: "JejakAudit",
        alias: "audit",
        label: "Jejak Audit",
        icon: "history",
      },
      {
        page: "BackupData",
        alias: "backup",
        label: "Backup Data",
        icon: "restore",
      },
    ],
  },
]

export function SidebarOwner(props: SidebarProps) {
  return (
    <BaseSidebar
      {...props}
      groups={OWNER_GROUPS}
      user={{
        name: props.userName || "Ardi Pradana",
        role: "Owner",
        roleBadge: "OWNER",
      }}
    />
  )
}

export default SidebarOwner
