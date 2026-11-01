import { BaseSidebar, SidebarNavGroup, SidebarProps } from "./BaseSidebar"

const KASIR_GROUPS: SidebarNavGroup[] = [
  {
    id: "utama",
    title: "UTAMA",
    items: [
      {
        page: "KasirPOS",
        alias: "cashier",
        label: "Kasir POS",
        icon: "cashier",
      },
    ],
  },
  {
    id: "transaksi",
    title: "TRANSAKSI",
    items: [
      {
        page: "RiwayatTransaksi",
        alias: "history",
        label: "Riwayat Transaksi",
        icon: "history",
      },
      {
        page: "RekapManual",
        alias: "manual",
        label: "Rekap Manual",
        icon: "pencil",
      },
    ],
  },
]

export function SidebarKasir(props: SidebarProps) {
  return (
    <BaseSidebar
      {...props}
      groups={KASIR_GROUPS}
      user={{
        name: "Siti Rahma",
        role: "Kasir",
        roleBadge: "KASIR",
      }}
    />
  )
}

export default SidebarKasir
