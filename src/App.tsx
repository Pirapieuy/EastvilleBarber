import { useState } from "react"
import { AppLayout } from "./layouts/AppLayout"
import { Login } from "./components/common/Login"
import { AppUser, DEMO_USERS, Role, toRoleKey } from "./types"
import { clearToken } from "./api"

// Kasir Pages
import { KasirPOS } from "./pages/kasir/KasirPOS"
import { RiwayatTransaksi as RiwayatTransaksiKasir } from "./pages/kasir/RiwayatTransaksi"
import { RekapManual as RekapManualKasir } from "./pages/kasir/RekapManual"

// Manajer Pages
import { BerandaManajer } from "./pages/manajer/BerandaManajer"
import { RiwayatTransaksi as RiwayatTransaksiManajer } from "./pages/manajer/RiwayatTransaksi"
import { LaporanKeuangan as LaporanKeuanganManajer } from "./pages/manajer/LaporanKeuangan"
import { LaporanProduk as LaporanProdukManajer } from "./pages/manajer/LaporanProduk"
import { Pengeluaran as PengeluaranManajer } from "./pages/manajer/Pengeluaran"
import { RekapManual as RekapManualManajer } from "./pages/manajer/RekapManual"
import { LayananHarga as LayananHargaManajer } from "./pages/manajer/LayananHarga"
import { MasterProduk as MasterProdukManajer } from "./pages/manajer/MasterProduk"
import { TimManajer } from "./pages/manajer/TimManajer"
import { GajiKasbon as GajiKasbonManajer } from "./pages/manajer/GajiKasbon"
import { AbsensiTim } from "./pages/manajer/AbsensiTim"

// Owner Pages
import { BerandaOwner } from "./pages/owner/BerandaOwner"
import { RiwayatTransaksi as RiwayatTransaksiOwner } from "./pages/owner/RiwayatTransaksi"
import { LaporanKeuangan as LaporanKeuanganOwner } from "./pages/owner/LaporanKeuangan"
import { LaporanProduk as LaporanProdukOwner } from "./pages/owner/LaporanProduk"
import { Pengeluaran as PengeluaranOwner } from "./pages/owner/Pengeluaran"
import { RekapManual as RekapManualOwner } from "./pages/owner/RekapManual"
import { LayananHarga as LayananHargaOwner } from "./pages/owner/LayananHarga"
import { MasterProduk as MasterProdukOwner } from "./pages/owner/MasterProduk"
import { TimEastville } from "./pages/owner/TimEastville"
import { GajiKasbon as GajiKasbonOwner } from "./pages/owner/GajiKasbon"
import { AbsensiAdmin as AbsensiAdminOwner } from "./pages/owner/AbsensiAdmin"
import { JejakAudit as JejakAuditOwner } from "./pages/owner/JejakAudit"
import { BackupData as BackupDataOwner } from "./pages/owner/BackupData"

// Kapster Pages
import { BerandaKapster } from "./pages/kapster/BerandaKapster"
import { GajiKomisiSaya } from "./pages/kapster/GajiKomisiSaya"
import { KomisiProdukSaya } from "./pages/kapster/KomisiProdukSaya"
import { AbsensiJadwalSaya } from "./pages/kapster/AbsensiJadwalSaya"

const ROLE_DEFAULT_PAGES: Record<Role, string> = {
  Owner: "BerandaOwner",
  Manajer: "BerandaManajer",
  Kasir: "KasirPOS",
  Kapster: "BerandaKapster",
}

export function App() {
  const [loggedIn, setLoggedIn] = useState(true)
  const [currentRole, setCurrentRole] = useState<Role>("Owner")
  const [activePage, setActivePage] = useState<string>("BerandaOwner")

  // User asli dari backend (hasil login). Kalau role diganti lewat pengalih peran demo,
  // kembali ke data demo untuk peran itu.
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null)
  const currentUser =
    sessionUser && sessionUser.role === currentRole
      ? sessionUser
      : DEMO_USERS[currentRole]
  const roleKey = toRoleKey(currentRole)

  function handleRoleChange(newRole: Role) {
    setCurrentRole(newRole)
    setActivePage(ROLE_DEFAULT_PAGES[newRole])
  }

  if (!loggedIn) {
    return (
      <Login
        onLogin={(user, targetPage) => {
          setSessionUser(user)
          setCurrentRole(user.role)
          setLoggedIn(true)
          if (targetPage) {
            setActivePage(targetPage)
          } else {
            setActivePage(ROLE_DEFAULT_PAGES[user.role])
          }
        }}
      />
    )
  }

  function renderPageContent() {
    if (roleKey === "kasir") {
      if (activePage === "KasirPOS" || activePage === "cashier") {
        return <KasirPOS currentUser={currentUser} onNavigate={setActivePage} />
      }
      if (activePage === "RiwayatTransaksi" || activePage === "history") {
        return <RiwayatTransaksiKasir currentUser={currentUser} />
      }
      if (activePage === "RekapManual" || activePage === "manual") {
        return <RekapManualKasir />
      }
      return <KasirPOS currentUser={currentUser} onNavigate={setActivePage} />
    }

    if (roleKey === "manajer") {
      if (activePage === "BerandaManajer" || activePage === "dashboard") {
        return (
          <BerandaManajer
            user={currentUser}
            onNavigate={setActivePage}
            navigate={setActivePage}
          />
        )
      }
      if (activePage === "RiwayatTransaksi" || activePage === "history") {
        return <RiwayatTransaksiManajer currentUser={currentUser} />
      }
      if (activePage === "LaporanKeuangan" || activePage === "reports") {
        return <LaporanKeuanganManajer currentUser={currentUser} />
      }
      if (activePage === "LaporanProduk" || activePage === "product-reports") {
        return <LaporanProdukManajer currentUser={currentUser} />
      }
      if (activePage === "Pengeluaran" || activePage === "expenses") {
        return <PengeluaranManajer />
      }
      if (activePage === "RekapManual" || activePage === "manual") {
        return <RekapManualManajer />
      }
      if (activePage === "LayananHarga" || activePage === "services") {
        return <LayananHargaManajer />
      }
      if (activePage === "MasterProduk" || activePage === "products") {
        return <MasterProdukManajer />
      }
      if (activePage === "TimManajer" || activePage === "team") {
        return <TimManajer currentUser={currentUser} />
      }
      if (activePage === "GajiKasbon" || activePage === "payroll") {
        return <GajiKasbonManajer />
      }
      if (
        activePage === "AbsensiTim" ||
        activePage === "attendance-admin" ||
        activePage === "attendance-tim"
      ) {
        return <AbsensiTim currentUser={currentUser} />
      }
      return (
        <BerandaManajer
          user={currentUser}
          onNavigate={setActivePage}
          navigate={setActivePage}
        />
      )
    }

    if (roleKey === "kapster") {
      if (activePage === "BerandaKapster" || activePage === "dashboard") {
        return (
          <BerandaKapster
            user={currentUser}
            onNavigate={setActivePage}
            navigate={setActivePage}
          />
        )
      }
      if (activePage === "GajiKomisiSaya" || activePage === "my-salary") {
        return <GajiKomisiSaya />
      }
      if (
        activePage === "KomisiProdukSaya" ||
        activePage === "product-reports" ||
        activePage === "komisi-produk"
      ) {
        return <KomisiProdukSaya currentUser={currentUser} />
      }
      if (activePage === "AbsensiJadwalSaya" || activePage === "attendance") {
        return <AbsensiJadwalSaya />
      }
      return (
        <BerandaKapster
          user={currentUser}
          onNavigate={setActivePage}
          navigate={setActivePage}
        />
      )
    }

    // Role Owner
    if (activePage === "BerandaOwner" || activePage === "dashboard") {
      return (
        <BerandaOwner
          onNavigate={setActivePage}
          navigate={setActivePage}
        />
      )
    }
    if (activePage === "RiwayatTransaksi" || activePage === "history") {
      return <RiwayatTransaksiOwner currentUser={currentUser} />
    }
    if (activePage === "LaporanKeuangan" || activePage === "reports") {
      return <LaporanKeuanganOwner currentUser={currentUser} />
    }
    if (activePage === "LaporanProduk" || activePage === "product-reports") {
      return <LaporanProdukOwner currentUser={currentUser} />
    }
    if (activePage === "Pengeluaran" || activePage === "expenses") {
      return <PengeluaranOwner />
    }
    if (activePage === "RekapManual" || activePage === "manual") {
      return <RekapManualOwner />
    }
    if (activePage === "LayananHarga" || activePage === "services") {
      return <LayananHargaOwner />
    }
    if (activePage === "MasterProduk" || activePage === "products") {
      return <MasterProdukOwner />
    }
    if (activePage === "TimEastville" || activePage === "team") {
      return <TimEastville currentUser={currentUser} />
    }
    if (activePage === "GajiKasbon" || activePage === "payroll") {
      return <GajiKasbonOwner />
    }
    if (activePage === "AbsensiAdmin" || activePage === "attendance-admin") {
      return <AbsensiAdminOwner currentUser={currentUser} />
    }
    if (activePage === "JejakAudit" || activePage === "audit") {
      return <JejakAuditOwner />
    }
    if (activePage === "BackupData" || activePage === "backup") {
      return <BackupDataOwner />
    }
    return (
      <BerandaOwner
        onNavigate={setActivePage}
        navigate={setActivePage}
      />
    )
  }

  return (
    <AppLayout
      activePage={activePage}
      currentRole={currentRole}
      userName={currentUser.name}
      onLogout={() => {
        clearToken()
        setSessionUser(null)
        setLoggedIn(false)
      }}
      onNavigate={setActivePage}
      // Pengalih peran demo disembunyikan saat login lewat backend: role ditentukan akun,
      // dan server menolak aksi di luar role token.
      onRoleChange={sessionUser ? undefined : handleRoleChange}
    >
      {renderPageContent()}
    </AppLayout>
  )
}

export default App
