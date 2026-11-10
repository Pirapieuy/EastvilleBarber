import { BaseSidebar, SidebarNavGroup, SidebarProps } from "./BaseSidebar"

const MANAJER_GROUPS: SidebarNavGroup[] = [
  {
    id: "utama",
    title: "UTAMA",
    items: [
      {
        page: "BerandaManajer",
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
        page: "Pengeluaran",
        alias: "expenses",
        label: "Pengeluaran",
        icon: "expense",
      },
      {
        page: "RekapManual",
        alias: "manual",
        label: "Input Nota Kertas",
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
        page: "TimManajer",
        alias: "team",
        label: "Tim Manajer",
        icon: "team",
      },
      {
        page: "GajiKasbon",
        alias: "payroll",
        label: "Gaji & Kasbon",
        icon: "wallet",
      },
      { page: "RiwayatAbsensi", alias: "attendance-history", label: "Riwayat Absensi", icon: "calendar" },
    ],
  },
]

export function SidebarManajer(props: SidebarProps) {
  return (
    <BaseSidebar
      {...props}
      groups={MANAJER_GROUPS}
      user={{
        name: props.userName || "Dian Setiawan",
        role: "Manajer",
        roleBadge: "MANAJER",
      }}
    />
  )
}

export default SidebarManajer
