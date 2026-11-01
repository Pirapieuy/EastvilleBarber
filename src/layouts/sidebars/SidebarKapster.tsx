import { BaseSidebar, SidebarNavGroup, SidebarProps } from "./BaseSidebar"

const KAPSTER_GROUPS: SidebarNavGroup[] = [
  {
    id: "utama",
    title: "UTAMA",
    items: [
      {
        page: "BerandaKapster",
        alias: "dashboard",
        label: "Beranda",
        icon: "home",
      },
    ],
  },
  {
    id: "komisi-jadwal",
    title: "KOMISI & JADWAL",
    items: [
      {
        page: "GajiKomisiSaya",
        alias: "my-salary",
        label: "Gaji & Komisi Saya",
        icon: "wallet",
      },
      {
        page: "KomisiProdukSaya",
        alias: "product-reports",
        label: "Komisi Produk Saya",
        icon: "product",
      },
      {
        page: "AbsensiJadwalSaya",
        alias: "attendance",
        label: "Absensi & Jadwal Saya",
        icon: "camera",
      },
    ],
  },
]

export function SidebarKapster(props: SidebarProps) {
  return (
    <BaseSidebar
      {...props}
      groups={KAPSTER_GROUPS}
      user={{
        name: props.userName || "Seva",
        role: "Kapster",
        roleBadge: "KAPSTER",
      }}
    />
  )
}

export default SidebarKapster
