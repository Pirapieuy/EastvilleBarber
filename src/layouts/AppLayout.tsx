import { ReactNode, useEffect, useState } from "react"
import { Icon } from "../components/common/Icon"
import { Button } from "../components/common/UI"
import { SidebarKasir } from "./sidebars/SidebarKasir"
import { SidebarManajer } from "./sidebars/SidebarManajer"
import { SidebarOwner } from "./sidebars/SidebarOwner"
import { SidebarKapster } from "./sidebars/SidebarKapster"
import { Role, RoleType, toRoleKey } from "../types"

export interface AppLayoutProps {
  currentRole: RoleType
  activePage: string
  onNavigate: (page: string) => void
  onRoleChange?: (role: Role) => void
  onLogout?: () => void
  userName?: string
  children?: ReactNode
}

const PAGE_TITLE_MAP: Record<string, string> = {
  BerandaOwner: "Beranda",
  BerandaManajer: "Beranda",
  BerandaKapster: "Beranda",
  KasirPOS: "Kasir POS",
  cashier: "Kasir POS",
  dashboard: "Beranda",
  RiwayatTransaksi: "Riwayat Transaksi",
  history: "Riwayat Transaksi",
  LaporanKeuangan: "Laporan Keuangan",
  reports: "Laporan Keuangan",
  LaporanProduk: "Laporan Produk",
  "product-reports": "Laporan Produk",
  "laporan-produk": "Laporan Produk",
  "product-report": "Laporan Produk",
  Pengeluaran: "Pengeluaran",
  expenses: "Pengeluaran",
  RekapManual: "Input Manual",
  manual: "Input Manual",
  KatalogLayananProduk: "Layanan & Produk",
  catalog: "Layanan & Produk",
  LayananHarga: "Layanan & Produk",
  services: "Layanan & Produk",
  MasterProduk: "Layanan & Produk",
  products: "Layanan & Produk",
  TimEastville: "Tim Eastville",
  TimManajer: "Tim Manajer",
  team: "Tim",
  GajiKasbon: "Gaji & Kasbon",
  payroll: "Gaji & Kasbon",
  GajiKomisiSaya: "Gaji & Komisi Saya",
  "my-salary": "Gaji & Komisi Saya",
  KomisiProdukSaya: "Komisi Produk Saya",
  "komisi-produk": "Komisi Produk Saya",
  AbsensiAdmin: "Jam Kerja",
  AbsensiTim: "Jam Kerja",
  AbsensiJadwalSaya: "Absensi & Jadwal Saya",
  attendance: "Absensi & Jadwal Saya",
  "attendance-admin": "Jam Kerja",
  "attendance-tim": "Jam Kerja",
  AbsensiKapster: "Absensi Kapster",
  KasbonKapster: "Kasbon Kapster",
  "kasbon-kapster": "Kasbon Kapster",
  IzinKapster: "Izin Kapster",
  "izin-kapster": "Izin Kapster",
  RiwayatAbsensi: "Riwayat Absensi",
  "attendance-history": "Riwayat Absensi",
  JadwalAbsensi: "Jam Kerja",
  "jadwal-absensi": "Jam Kerja",
  JejakAudit: "Jejak Audit",
  audit: "Jejak Audit",
  BackupData: "Backup Data",
  backup: "Backup Data",
}

function getSapaan() {
  const jam = new Date().getHours()
  return jam < 11 ? "pagi" : jam < 15 ? "siang" : jam < 18 ? "sore" : "malam"
}

export function AppLayout({
  currentRole,
  activePage,
  onNavigate,
  onLogout,
  userName,
  children,
}: AppLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)

  const roleKey = toRoleKey(currentRole)

  useEffect(() => {
    if (roleKey === "owner") return

    const responsiveViewport = window.matchMedia("(max-width: 1024px)")
    const closeDrawerOnResponsiveEntry = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileNav(false)
    }

    responsiveViewport.addEventListener("change", closeDrawerOnResponsiveEntry)
    return () =>
      responsiveViewport.removeEventListener(
        "change",
        closeDrawerOnResponsiveEntry,
      )
  }, [roleKey])

  const pageTitle = PAGE_TITLE_MAP[activePage] || "Eastville"
  const firstName = userName ? userName.split(" ")[0] : ""
  const greeting = firstName
    ? `Selamat ${getSapaan()}, ${firstName}`
    : pageTitle

  function handleNavigate(page: string) {
    onNavigate(page)
    setMobileNav(false)
  }

  return (
    <div
      className={`app-shell ${
        sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"
      }`}
    >
      <div
        className={`mobile-overlay ${mobileNav ? "show" : ""}`}
        onClick={() => setMobileNav(false)}
      />

      <div className={`sidebar-wrap ${mobileNav ? "open" : ""}`}>
        {roleKey === "kasir" && (
          <SidebarKasir
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            userName={userName}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "manajer" && (
          <SidebarManajer
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            userName={userName}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "owner" && (
          <SidebarOwner
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            userName={userName}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "kapster" && (
          <SidebarKapster
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            userName={userName}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
      </div>

      <main className="workspace">
        <header className="mobile-top-navbar">
          <Button
            className="mobile-burger-btn"
            onClick={() => setMobileNav(true)}
            aria-label="Buka menu navigasi"
            title="Buka Menu"
          >
            <Icon name="menu" />
          </Button>
          <div className="mobile-navbar-brand">
            <span className="mobile-navbar-title">{pageTitle}</span>
          </div>
          <div className="mobile-navbar-spacer" />
        </header>
        {children}
      </main>
    </div>
  )
}

export default AppLayout
