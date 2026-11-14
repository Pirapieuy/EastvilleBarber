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
    id: "laporan",
    title: "LAPORAN",
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
        alias: "product-report",
        label: "Laporan Produk",
        icon: "settings",
      },
      {
        page: "RekapManual",
        alias: "manual",
        label: "Input Manual",
        icon: "pencil",
      },
    ],
  },
  {
    id: "katalog-karyawan",
    title: "KATALOG & KARYAWAN",
    items: [
      {
        page: "KatalogLayananProduk",
        alias: "catalog",
        label: "Layanan & Produk",
        icon: "settings",
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
        page: "RiwayatAbsensi",
        alias: "attendance-history",
        label: "Riwayat Absensi",
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
