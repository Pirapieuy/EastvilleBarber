import { FormEvent, ReactNode, useMemo, useState } from "react"

type Page = "dashboard" | "cashier" | "history" | "manual" | "expenses" | "payroll" | "my-salary" | "reports" | "product-reports" | "team" | "services" | "products" | "attendance" | "attendance-admin" | "audit" | "backup"

type IconName = "alert" | "arrow" | "back" | "calendar" | "camera" | "cash" | "cashier" | "chart" | "check" | "chevron" | "clock" | "close" | "expense" | "eye" | "file" | "history" | "home" | "lock" | "logout" | "mail" | "menu" | "minus" | "pencil" | "people" | "plus" | "print" | "product" | "qris" | "receipt" | "restore" | "search" | "settings" | "team" | "trash" | "user" | "wallet" | "whatsapp"

const iconPaths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 8v4.5M12 16.3v.2" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  back: <path d="m14 6-6 6 6 6M8 12h11" />,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6.5 9h.01M17.5 15h.01" />
    </>
  ),
  cashier: (
    <>
      <path d="M5 4h14v5H5zM4 9h16v11H4z" />
      <path d="M8 13h3M8 16h3M15.5 13.5v3" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  check: <path d="m5 12 4.2 4.2L19 6.8" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  expense: (
    <>
      <path d="M12 3v18M7.5 7.5H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7.5" />
      <path d="m5 5-2 2 2 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  history: (
    <>
      <path d="M4 7v5h5M4.8 11a8 8 0 1 1 2.1 6.8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  minus: <path d="M6 12h12" />,
  pencil: (
    <>
      <path d="m14 5 5 5L9 20l-5 1 1-5L15 6Z" />
      <path d="m12 8 5 5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.7 2.3-5.5 5.5-5.5s5 1.8 5.5 5.5M15 5.5a3 3 0 0 1 0 5.8M16 14c2.7.2 4.2 1.9 4.5 5" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  print: (
    <>
      <path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  product: (
    <>
      <path d="m4 8 8-4 8 4-8 4-8-4Z" />
      <path d="m4 8 8 4 8-4v9l-8 4-8-4V8ZM12 12v9" />
    </>
  ),
  qris: (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M15 14h2v2h-2zM18 18h2v2h-2zM14 19h2M19 14h1" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  restore: <path d="M4 7v5h5M4.8 11a8 8 0 1 1 2.1 6.8" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.7 2.3-5.5 5.5-5.5s5 1.8 5.5 5.5M15 5.5a3 3 0 0 1 0 5.8M16 14c2.7.2 4.2 1.9 4.5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v8a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 2 18V6a2.5 2.5 0 0 1 2.5-2.5H17" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z" />
      <path d="M8.2 7.8c.3-.5.7-.5 1-.1l1 1.8c.2.3.1.7-.2 1l-.6.6c.8 1.6 2 2.7 3.6 3.4l.6-.7c.3-.3.6-.4 1-.2l1.8.9c.4.2.4.7.2 1-1 1.6-2.4 1.8-4.2 1.1-3.1-1.2-5.3-3.4-6.4-6.4-.5-1.2.2-2.2 1.2-2.4Z" />
    </>
  ),
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function Button({
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  title,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit"
  title?: string
}) {
  return (
    <button
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
      title={title}
    >
      {children}
    </button>
  )
}

const rupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(value)}`

type Role = "Owner" | "Manajer" | "Kasir" | "Kapster"

interface AppUser {
  id: string
  name: string
  username: string
  role: Role
}

const DEMO_USERS: Record<Role, AppUser> = {
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

const roleMenuConfig: Record<Role, {
  page: Page
  label: string
  icon: IconName
}[]> = {
  Kasir: [
    { page: "cashier", label: "Kasir (POS)", icon: "cashier" },
    { page: "history", label: "Riwayat Transaksi", icon: "history" },
    { page: "manual", label: "Rekap Manual", icon: "pencil" },
  ],
  Kapster: [
    { page: "dashboard", label: "Beranda Kapster", icon: "home" },
    { page: "my-salary", label: "Gaji & Komisi Saya", icon: "wallet" },
    { page: "product-reports", label: "Komisi Produk Saya", icon: "product" },
    { page: "attendance", label: "Absensi & Jadwal Saya", icon: "camera" },
  ],
  Manajer: [
    { page: "dashboard", label: "Beranda", icon: "home" },
    { page: "history", label: "Riwayat Transaksi", icon: "history" },
    { page: "manual", label: "Rekap Manual", icon: "pencil" },
    { page: "expenses", label: "Pengeluaran", icon: "expense" },
    { page: "payroll", label: "Gaji & Kasbon", icon: "wallet" },
    { page: "reports", label: "Laporan Keuangan", icon: "chart" },
    { page: "product-reports", label: "Laporan Produk", icon: "product" },
    { page: "team", label: "Tim", icon: "team" },
    { page: "services", label: "Layanan & Harga", icon: "settings" },
    { page: "products", label: "Master Produk", icon: "product" },
    { page: "attendance-admin", label: "Absensi Tim", icon: "calendar" },
  ],
  Owner: [
    { page: "dashboard", label: "Beranda Eksekutif", icon: "home" },
    { page: "history", label: "Riwayat Transaksi", icon: "history" },
    { page: "manual", label: "Rekap Manual", icon: "pencil" },
    { page: "expenses", label: "Pengeluaran", icon: "expense" },
    { page: "payroll", label: "Gaji & Kasbon", icon: "wallet" },
    { page: "reports", label: "Laporan Keuangan", icon: "chart" },
    { page: "product-reports", label: "Laporan Produk", icon: "product" },
    { page: "team", label: "Tim Eastville", icon: "team" },
    { page: "services", label: "Layanan & Harga", icon: "settings" },
    { page: "products", label: "Master Produk", icon: "product" },
    { page: "attendance-admin", label: "Absensi Admin", icon: "calendar" },
    { page: "audit", label: "Jejak Audit", icon: "history" },
    { page: "backup", label: "Backup Data", icon: "restore" },
  ],
}

function BrandMark({
  onClick,
  isCollapsed = false,
  title,
}: {
  onClick?: () => void
  isCollapsed?: boolean
  title?: string
}) {
  return (
    <div
      className={`brand-mark ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      <div className="monogram">B</div>
      <div className="brand-text">
        <div className="brand-name">BarberBoss</div>
        <div className="brand-caption">Eastville Barbershop</div>
      </div>
      {onClick && !isCollapsed && (
        <div
          className="sidebar-toggle-indicator"
          title="Klik logo untuk ringkas"
        >
          <Icon name="chevron" />
        </div>
      )}
    </div>
  )
}

interface PrototypeCredential {
  user: AppUser
  pin: string
  redirectPage: Page
  roleTitle: Role
}

const PROTOTYPE_CREDENTIALS: Record<string, PrototypeCredential> = {
  "ardi.owner": {
    user: DEMO_USERS.Owner,
    pin: "111111",
    redirectPage: "dashboard",
    roleTitle: "Owner",
  },
  "dian.manajer": {
    user: DEMO_USERS.Manajer,
    pin: "222222",
    redirectPage: "services",
    roleTitle: "Manajer",
  },
  "siti.kasir": {
    user: DEMO_USERS.Kasir,
    pin: "333333",
    redirectPage: "cashier",
    roleTitle: "Kasir",
  },
  "seva.kapster": {
    user: DEMO_USERS.Kapster,
    pin: "444444",
    redirectPage: "dashboard",
    roleTitle: "Kapster",
  },
}

function Login({
  onLogin,
}: {
  onLogin: (user: AppUser, targetPage?: Page) => void
}) {
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [view, setView] = useState<"login" | "email" | "sent" | "reset">(
    "login",
  )
  const [email, setEmail] = useState("")
  const [newPin, setNewPin] = useState("")

  const [loading, setLoading] = useState(false)

  const API_URL =
    "https://script.google.com/macros/s/AKfycbxAX3C4Jb288yjmVolS9neAdzZumfjZ0wNQdC2Hg_TuuqrBTrpHwGGERlGzRlI0ZHTNkQ/exec"

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    const cleanPin = pin.trim()

    if (!cleanUsername) {
      setError("Masukkan username Anda.")
      return
    }
    if (!cleanPin || cleanPin.length !== 6) {
      setError("Masukkan PIN 6 digit.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "login", username: cleanUsername, pin: cleanPin }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || "Login gagal.")
        return
      }

      const { user } = data.data
      const appUser: AppUser = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role as Role,
      }
      const targetPage: Page =
        appUser.role === "Kasir"
          ? "cashier"
          : appUser.role === "Kapster"
            ? "dashboard"
            : appUser.role === "Manajer"
              ? "dashboard"
              : "dashboard"

      setError("")
      onLogin(appUser, targetPage)
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }
  if (view !== "login") {
    return (
      <main className="login-page">
        <section className="login-brand">
          <div className="barber-stripe" />
          <BrandMark />
          <div className="login-message">
            <p className="eyebrow">Pemulihan akun</p>
            <h1>Akses aman untuk kembali bekerja.</h1>
            <p>
              Atur ulang PIN melalui email yang terdaftar pada akun Eastville.
            </p>
          </div>
        </section>
        <section className="login-form-wrap">
          <div className="login-card reset-card">
            <div className="login-mobile-header">
              <BrandMark />
            </div>
            {view === "email" && (
              <>
                <Button className="auth-back" onClick={() => setView("login")}>
                  <Icon name="back" /> Kembali
                </Button>
                <p className="eyebrow">Lupa PIN</p>
                <h2>Temukan akun Anda</h2>
                <p>Masukkan email yang terdaftar pada data karyawan.</p>
                <label>
                  <span>Email</span>
                  <div className="input-shell">
                    <Icon name="mail" />
                    <input
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nama@eastville.id"
                      type="email"
                      value={email}
                    />
                  </div>
                </label>
                <Button
                  className="primary-button"
                  disabled={!email.includes("@")}
                  onClick={() => setView("sent")}
                >
                  Kirim tautan reset <Icon name="arrow" />
                </Button>
              </>
            )}
            {view === "sent" && (
              <div className="auth-success">
                <span>
                  <Icon name="mail" />
                </span>
                <p className="eyebrow">Email terkirim</p>
                <h2>Tautan reset dikirim</h2>
                <p>
                  Periksa kotak masuk <strong>{email}</strong> dan ikuti tautan
                  yang diberikan.
                </p>
                <Button
                  className="primary-button"
                  onClick={() => setView("reset")}
                >
                  Buka simulasi tautan
                </Button>
                <Button
                  className="text-button"
                  onClick={() => setView("email")}
                >
                  Gunakan email lain
                </Button>
              </div>
            )}
            {view === "reset" && (
              <>
                <p className="eyebrow">Buat PIN baru</p>
                <h2>Atur ulang PIN</h2>
                <p>
                  Gunakan enam digit yang mudah Anda ingat tetapi sulit ditebak.
                </p>
                <label>
                  <span>PIN baru</span>
                  <div className="input-shell">
                    <Icon name="lock" />
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) =>
                        setNewPin(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="••••••"
                      type="password"
                      value={newPin}
                    />
                  </div>
                  <small className="pin-helper">{newPin.length}/6 digit</small>
                </label>
                <Button
                  className="primary-button"
                  disabled={newPin.length !== 6}
                  onClick={() => {
                    setPin("")
                    setView("login")
                  }}
                >
                  Simpan PIN baru
                </Button>
              </>
            )}
          </div>
        </section>
      </main>
    )
  }
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="barber-stripe" />
        <BrandMark />
        <div className="login-message">
          <p className="eyebrow">Ruang kerja Eastville</p>
          <h1>Lebih rapi mengelola, lebih fokus melayani.</h1>
          <p>Satu tempat untuk transaksi, komisi, dan operasional harian.</p>
        </div>
        <div className="online">
          <i /> Sistem operasional terhubung
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-mobile-header">
            <BrandMark />
          </div>
          <h1 className="login-title">LOGIN</h1>
          <label>
            <span>Username</span>
            <div className="input-shell">
              <Icon name="user" />
              <input
                autoCapitalize="none"
                autoComplete="username"
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError("")
                }}
                placeholder="Contoh: ardi.owner"
                value={username}
              />
            </div>
          </label>
          <label>
            <span>PIN</span>
            <div className={`input-shell ${error ? "error" : ""}`}>
              <Icon name="lock" />
              <input
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""))
                  setError("")
                }}
                placeholder="••••••"
                type={show ? "text" : "password"}
                value={pin}
              />
              <Button
                aria-label={show ? "Sembunyikan PIN" : "Tampilkan PIN"}
                onClick={() => setShow(!show)}
                type="button"
              >
                <Icon name="eye" />
              </Button>
            </div>
            {error && <small>{error}</small>}
          </label>
          <Button className="primary-button login-submit-btn" type="submit" disabled={loading}>
            {loading ? "Memuat..." : <>Masuk <Icon name="arrow" /></>}
          </Button>
          <Button
            className="text-button"
            onClick={() => setView("email")}
            type="button"
          >
            Lupa PIN?
          </Button>
          <div className="secure-note">
            <Icon name="lock" /> PIN disimpan aman dan tidak pernah ditampilkan.
          </div>
        </form>
      </section>
    </main>
  )
}

function Sidebar({
  active,
  currentUser,
  expanded,
  onNavigate,
  onLogout,
  onToggleExpanded,
}: {
  active: Page
  currentUser: AppUser
  expanded: boolean
  onNavigate: (page: Page) => void
  onLogout: () => void
  onToggleExpanded: () => void
}) {
  const allowedItems = roleMenuConfig[currentUser.role] || []

  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <BrandMark
        isCollapsed={!expanded}
        onClick={onToggleExpanded}
        title={
          expanded
            ? "Klik logo untuk ringkas sidebar"
            : "Klik logo untuk buka menu lengkap"
        }
      />
      <nav>
        {allowedItems.map((item) => (
          <Button
            className={`nav-item ${active === item.page ? "active" : ""}`}
            key={item.page}
            onClick={() => onNavigate(item.page)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {expanded ? (
          <div className="sidebar-account-row">
            <div className="sidebar-user-card">
              <div className="user-avatar-circle">
                {currentUser.name.charAt(0)}
              </div>
              <div className="user-info-text">
                <strong>{currentUser.name}</strong>
                <span
                  className={`role-chip role-${currentUser.role.toLowerCase()}`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>
            <Button className="logout-button" onClick={onLogout} title="Keluar">
              <Icon name="logout" />
            </Button>
          </div>
        ) : (
          <Button
            className="nav-item sidebar-user-pill"
            onClick={onLogout}
            title={`${currentUser.name} (${currentUser.role}) · Keluar`}
          >
            <Icon name="logout" />
            <span className="sidebar-tooltip">
              Keluar ({currentUser.name})
            </span>
          </Button>
        )}
      </div>
    </aside>
  )
}

function AppHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="app-header">
      <Button className="mobile-menu" onClick={onMenu}>
        <Icon name="menu" />
      </Button>
    </header>
  )
}

function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function Kpi({
  icon,
  label,
  tone,
  value,
  detail,
}: {
  icon: IconName
  label: string
  tone: string
  value: string
  detail: string
}) {
  return (
    <article className="kpi">
      <span className={`kpi-icon ${tone}`}>
        <Icon name={icon} />
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function KapsterDashboard({
  user,
  navigate,
}: {
  user: AppUser
  navigate: (page: Page) => void
}) {
  return (
    <div className="content kapster-dashboard">
      <PageTitle
        eyebrow="Rabu, 29 Oktober 2026 · Shift aktif"
        title={`Selamat pagi, ${user.name.split(" ")[0]}.`}
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => navigate("my-salary")}
            >
              <Icon name="wallet" /> Rincian Gaji & Kasbon
            </Button>
            <Button
              className="primary-button"
              onClick={() => navigate("attendance")}
            >
              <Icon name="camera" /> Check-in Absensi
            </Button>
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="people"
          label="Pelanggan Dilayani"
          tone="sage"
          value="5 orang"
          detail="Target shift 8 jam: 6 orang"
        />
        <Kpi
          icon="wallet"
          label="Komisi Layanan"
          tone="brass"
          value="Rp 140.000"
          detail="40% dari 5 pengerjaan"
        />
        <Kpi
          icon="product"
          label="Komisi Produk"
          tone="amber"
          value="Rp 30.000"
          detail="3 produk terjual hari ini"
        />
        <Kpi
          icon="check"
          label="Status Kehadiran"
          tone="dark"
          value="Tepat Waktu"
          detail="Check-in 09.52 WIB · Foto selfie OK"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel kapster-shift-panel">
          <PageTitle
            eyebrow="Target & Proteksi Shift (v1.2 KK-61)"
            title="Progres Shift 8 Jam Hari Ini"
            action={
              <div className="shift-badges">
                <span className="chip active">Shift 8 Jam</span>
                <small className="pending-client">
                  Menunggu konfirmasi klien
                </small>
              </div>
            }
          />
          <div className="shift-overview">
            <div>
              <small>Sudah dilayani</small>
              <strong>5</strong>
              <span>dari 6 pelanggan</span>
            </div>
            <div>
              <small>Sisa target</small>
              <strong>1</strong>
              <span>pelanggan</span>
            </div>
            <p>
              Tinggal satu pelanggan lagi untuk mencapai target reguler hari
              ini. Jika target belum tercapai sampai akhir shift, proteksi
              minimum &quot;1,5&quot; akan dicatat.
            </p>
          </div>
          <div className="shift-progress">
            <div className="progress-bar-shell">
              <div className="progress-bar-fill" style={{ width: "83%" }} />
            </div>
            <div className="progress-meta">
              <span>5 dari 6 pelanggan</span>
              <strong>83%</strong>
            </div>
          </div>
        </section>

        <section className="panel kapster-activity-panel">
          <PageTitle
            eyebrow="Pengerjaan Anda hari ini"
            title="Aktivitas Layanan & Produk"
          />
          <div className="recent-list">
            {[
              {
                item: "Haircut Classic",
                time: "10.15",
                fee: 50000,
                comm: 20000,
                type: "Layanan",
              },
              {
                item: "Haircut + Wash + Tonic",
                time: "11.30",
                fee: 70000,
                comm: 28000,
                type: "Layanan",
              },
              {
                item: "Beard Trim",
                time: "13.20",
                fee: 35000,
                comm: 14000,
                type: "Layanan",
              },
              {
                item: "Free Style Dust",
                time: "14.05",
                fee: 80000,
                comm: 10000,
                type: "Produk",
              },
              {
                item: "Haircut Classic",
                time: "15.40",
                fee: 50000,
                comm: 20000,
                type: "Layanan",
              },
            ].map((row, idx) => (
              <div key={idx} className="recent-row">
                <div className="recent-icon">
                  <Icon name={row.type === "Produk" ? "product" : "cashier"} />
                </div>
                <div className="recent-info">
                  <strong>{row.item}</strong>
                  <small>
                    {row.time} WIB · Total {rupiah(row.fee)}
                  </small>
                </div>
                <div className="recent-amount">
                  <span className="comm-label">Komisi:</span>
                  <strong>{rupiah(row.comm)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function ManagerDashboard({
  user,
  navigate,
}: {
  user: AppUser
  navigate: (page: Page) => void
}) {
  return (
    <div className="content">
      <PageTitle
        eyebrow="Rabu, 29 Oktober 2026 · Operasional"
        title={`Selamat pagi, ${user.name.split(" ")[0]} (Manajer).`}
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => navigate("manual")}
            >
              <Icon name="pencil" /> Rekap Manual
            </Button>
            <Button
              className="primary-button"
              onClick={() => navigate("expenses")}
            >
              <Icon name="expense" /> Catat Pengeluaran
            </Button>
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value="Rp 2.450.000"
          detail="Tunai Rp 1.150.000 · QRIS Rp 1.300.000"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 320.000"
          detail="Operasional harian"
        />
        <Kpi
          icon="people"
          label="Komisi Kapster"
          tone="brass"
          value="Rp 980.000"
          detail="3 kapster bertugas hari ini"
        />
        <Kpi
          icon="check"
          label="Kehadiran Tim"
          tone="dark"
          value="3 / 3 Hadir"
          detail="Seva, Tatas, Ferdi · Tepat Waktu"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Operasional" title="Arus Pemasukan" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai: <strong>Rp 1.150.000</strong>
              </span>
            </div>
            <div>
              <i className="dot amber-dot" />
              <span>
                QRIS: <strong>Rp 1.300.000</strong>
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {[45, 60, 52, 70, 85, 65, 78].map((h, i) => (
              <div key={i} className="bar-col">
                <div className="bar-fill" style={{ height: `${h}%` }} />
                <small>
                  {["Kam", "Jum", "Sab", "Min", "Sen", "Sel", "Rab"][i]}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <PageTitle
            eyebrow="Kapster Bertugas"
            title="Status Shift & Absensi Hari Ini"
            action={
              <Button
                className="text-button"
                onClick={() => navigate("attendance-admin")}
              >
                Lihat Semua Foto <Icon name="arrow" />
              </Button>
            }
          />
          <div className="staff-duty-list">
            {[
              {
                name: "Seva",
                shift: "10.00 - 20.00",
                checkin: "09.52 WIB",
                status: "Tepat Waktu",
                done: 5,
              },
              {
                name: "Tatas",
                shift: "10.00 - 20.00",
                checkin: "09.48 WIB",
                status: "Tepat Waktu",
                done: 6,
              },
              {
                name: "Ferdi",
                shift: "12.00 - 21.00",
                checkin: "11.55 WIB",
                status: "Tepat Waktu",
                done: 4,
              },
            ].map((s, idx) => (
              <div key={idx} className="staff-duty-row">
                <div className="staff-avatar">{s.name.charAt(0)}</div>
                <div className="staff-duty-info">
                  <strong>{s.name}</strong>
                  <small>
                    Shift {s.shift} · Check-in: {s.checkin}
                  </small>
                </div>
                <div className="staff-duty-status">
                  <span className="chip active">{s.status}</span>
                  <small>{s.done} pelanggan dilayani</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Dashboard({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <div className="content">
      <PageTitle
        eyebrow="Ringkasan operasional"
        title="Selamat pagi, Ardi (Owner Eastville)."
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => navigate("manual")}
            >
              <Icon name="pencil" /> Rekap Manual
            </Button>
            <Button
              className="primary-button"
              onClick={() => navigate("expenses")}
            >
              <Icon name="expense" /> Catat Pengeluaran
            </Button>
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value="Rp 48.750.000"
          detail="+12,4% dari bulan lalu"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 8.420.000"
          detail="Turun 4,8%"
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value="Rp 18.650.000"
          detail="Layanan + produk"
        />
        <Kpi
          icon="wallet"
          label="Sisa untuk Owner"
          tone="dark"
          value="Rp 21.680.000"
          detail="+16,1% bulan ini"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Arus pemasukan" title="Pemasukan harian" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai<strong>Rp 31.420.000</strong>
              </span>
            </div>
            <div>
              <i className="dot brass-dot" />
              <span>
                QRIS<strong>Rp 17.330.000</strong>
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {[42, 58, 46, 72, 62, 84, 54, 91, 66, 78, 96, 74].map((_, i) => (
              <span className={`chart-bar b${i + 1}`} key={i}>
                <i />
                <b />
              </span>
            ))}
          </div>
          <div className="chart-labels">
            <span>1 Okt</span>
            <span>7 Okt</span>
            <span>14 Okt</span>
            <span>21 Okt</span>
            <span>29 Okt</span>
          </div>
        </section>
        <section className="panel attention">
          <PageTitle eyebrow="Tindakan diperlukan" title="Perlu perhatian" />
          {[
            {
              icon: "product" as IconName,
              title: "Stok produk menipis",
              text: "2 produk perlu ditambah",
            },
            {
              icon: "camera" as IconName,
              title: "Kendala absensi",
              text: "1 laporan menunggu",
            },
            {
              icon: "wallet" as IconName,
              title: "Gaji belum dibayar",
              text: "3 kapster periode ini",
            },
          ].map((x) => (
            <button key={x.title}>
              <span>
                <Icon name={x.icon} />
              </span>
              <div>
                <strong>{x.title}</strong>
                <small>{x.text}</small>
              </div>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}

type CatalogItem = {
  id: number
  name: string
  price: number
  type: "Layanan" | "Produk"
  stock?: number
  consignment?: boolean
}
const catalog: CatalogItem[] = [
  { id: 1, name: "Haircut", price: 40000, type: "Layanan" },
  { id: 2, name: "Haircut + Cuci", price: 50000, type: "Layanan" },
  { id: 3, name: "Shaving", price: 25000, type: "Layanan" },
  { id: 4, name: "Hair Coloring", price: 120000, type: "Layanan" },
  { id: 5, name: "Treatment", price: 60000, type: "Layanan" },
  { id: 6, name: "Free Style Dust", price: 70000, type: "Produk", stock: 3 },
  { id: 7, name: "Hair Paste Pomade", price: 70000, type: "Produk", stock: 8 },
  {
    id: 8,
    name: "Water Based Pomade",
    price: 70000,
    type: "Produk",
    stock: 5,
    consignment: true,
  },
  {
    id: 9,
    name: "Miracle Treatment",
    price: 70000,
    type: "Produk",
    stock: 0,
    consignment: true,
  },
]
type CartLine = CatalogItem & {
  lineId: string
  qty: number
  barber: string
}

function ReceiptView({
  cart,
  subtotal,
  discount,
  total,
  method,
  cash,
  qris,
  change,
  cashier,
  onClose,
}: {
  cart: CartLine[]
  subtotal: number
  discount: number
  total: number
  method: "Tunai" | "QRIS" | "Gabungan"
  cash: number
  qris: number
  change: number
  cashier: string
  onClose: () => void
}) {
  const [size, setSize] = useState<"58" | "80">("58")
  return (
    <div className="flow-page">
      <div className="flow-toolbar">
        <Button onClick={onClose}>
          <Icon name="back" /> Kembali
        </Button>
        <div className="segmented">
          <Button
            className={size === "58" ? "active" : ""}
            onClick={() => setSize("58")}
          >
            58 mm
          </Button>
          <Button
            className={size === "80" ? "active" : ""}
            onClick={() => setSize("80")}
          >
            80 mm
          </Button>
        </div>
        <Button className="primary-button" onClick={() => window.print()}>
          <Icon name="print" /> Cetak
        </Button>
      </div>
      <div className="receipt-stage">
        <article className={`thermal-receipt size-${size}`} id="print-receipt">
          <header>
            <div>E</div>
            <h2>EASTVILLE</h2>
            <p>EASTVILLE BARBERSHOP</p>
          </header>
          <hr />
          <dl>
            <div>
              <dt>Tanggal</dt>
              <dd>29 Okt 2026 · 10.24</dd>
            </div>
            <div>
              <dt>No. nota</dt>
              <dd>INV-291026-0084</dd>
            </div>
            <div>
              <dt>Kasir</dt>
              <dd>{cashier}</dd>
            </div>
          </dl>
          <hr />
          {cart.map((line) => (
            <div className="receipt-item" key={line.lineId}>
              <span>
                <strong>{line.name}</strong>
                <small>
                  Kapster: {line.barber} · {line.qty} ×{" "}
                  {new Intl.NumberFormat("id-ID").format(line.price)}
                </small>
              </span>
              <b>
                {new Intl.NumberFormat("id-ID").format(line.price * line.qty)}
              </b>
            </div>
          ))}
          <hr />
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{new Intl.NumberFormat("id-ID").format(subtotal)}</dd>
            </div>
            <div>
              <dt>Diskon</dt>
              <dd>− {new Intl.NumberFormat("id-ID").format(discount)}</dd>
            </div>
            <div className="receipt-total">
              <dt>TOTAL</dt>
              <dd>{rupiah(total)}</dd>
            </div>
          </dl>
          <hr />
          <dl>
            <div>
              <dt>Metode</dt>
              <dd>{method}</dd>
            </div>
            {method !== "QRIS" && (
              <div>
                <dt>Tunai</dt>
                <dd>{new Intl.NumberFormat("id-ID").format(cash)}</dd>
              </div>
            )}
            {method !== "Tunai" && (
              <div>
                <dt>QRIS</dt>
                <dd>{new Intl.NumberFormat("id-ID").format(qris)}</dd>
              </div>
            )}
            <div>
              <dt>Kembalian</dt>
              <dd>{new Intl.NumberFormat("id-ID").format(change)}</dd>
            </div>
          </dl>
          <hr />
          <footer>
            <strong>TERIMA KASIH</strong>
            <p>Sudah mempercayakan gaya Anda kepada Eastville.</p>
            <small>@eastvillebarbershop</small>
          </footer>
        </article>
      </div>
    </div>
  )
}

function PaymentModal({
  total,
  onClose,
  onSuccess,
}: {
  total: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState(total - 5000)
  const [qris, setQris] = useState(0)
  const [discountOpen, setDiscountOpen] = useState(false)
  const paid =
    method === "Tunai" ? cash : method === "QRIS" ? qris : cash + qris
  const shortage = Math.max(0, total - paid)
  return (
    <div className="modal-overlay">
      <section className="payment-modal">
        <header>
          <div>
            <p className="eyebrow">Selesaikan transaksi</p>
            <h2>Pembayaran</h2>
          </div>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <div className="payment-body">
          <aside>
            <h3>Ringkasan pesanan</h3>
            <div>
              <span>Haircut · Seva</span>
              <strong>Rp 40.000</strong>
            </div>
            <div>
              <span>Shaving · Tatas</span>
              <strong>Rp 25.000</strong>
            </div>
            <hr />
            <div className="big-total">
              <span>Total</span>
              <strong>{rupiah(total)}</strong>
            </div>
            <Button
              className="secondary-button"
              onClick={() => setDiscountOpen(true)}
            >
              <Icon name="lock" /> Beri diskon
            </Button>
          </aside>
          <main>
            <div className="method-grid">
              {(["Tunai", "QRIS", "Gabungan"] as const).map((m) => (
                <Button
                  className={method === m ? "active" : ""}
                  key={m}
                  onClick={() => {
                    setMethod(m)
                    if (m === "Tunai") {
                      setCash(total)
                      setQris(0)
                    } else if (m === "QRIS") {
                      setCash(0)
                      setQris(total)
                    } else {
                      setCash(30000)
                      setQris(total - 30000)
                    }
                  }}
                >
                  <Icon name={m === "QRIS" ? "qris" : "cash"} />
                  <span>
                    <strong>{m}</strong>
                    <small>
                      {m === "Gabungan" ? "Tunai + QRIS" : "Pencatatan manual"}
                    </small>
                  </span>
                </Button>
              ))}
            </div>
            <div className="money-fields">
              {method !== "QRIS" && (
                <label>
                  <span>Jumlah Tunai</span>
                  <div className="input-shell">
                    <b>Rp</b>
                    <input
                      inputMode="numeric"
                      onChange={(e) =>
                        setCash(Number(e.target.value.replace(/\D/g, "")))
                      }
                      value={cash}
                    />
                  </div>
                </label>
              )}
              {method !== "Tunai" && (
                <label>
                  <span>Jumlah QRIS</span>
                  <div className="input-shell">
                    <b>Rp</b>
                    <input
                      inputMode="numeric"
                      onChange={(e) =>
                        setQris(Number(e.target.value.replace(/\D/g, "")))
                      }
                      value={qris}
                    />
                  </div>
                </label>
              )}
            </div>
            {method === "Tunai" && (
              <div className="quick-money">
                <Button onClick={() => setCash(total)}>Uang pas</Button>
                <Button onClick={() => setCash(50000)}>50.000</Button>
                <Button onClick={() => setCash(100000)}>100.000</Button>
              </div>
            )}
            {method !== "Tunai" && (
              <div className="info-banner">
                <Icon name="qris" /> Pastikan pembayaran QRIS sudah masuk.
              </div>
            )}
            <div
              className={`payment-result ${shortage ? "danger" : "success"}`}
            >
              <span>{shortage ? "Pembayaran kurang" : "Kembalian"}</span>
              <strong>
                {shortage
                  ? `Kurang ${rupiah(shortage)}`
                  : rupiah(Math.max(0, cash - (total - qris)))}
              </strong>
            </div>
          </main>
        </div>
        <footer>
          <span>
            <Icon name="lock" /> Dihitung ulang oleh server
          </span>
          <Button
            className="primary-button"
            disabled={shortage > 0}
            onClick={onSuccess}
          >
            Simpan pembayaran <Icon name="arrow" />
          </Button>
        </footer>
      </section>
      {discountOpen && (
        <div className="nested-modal">
          <section>
            <header>
              <h3>Masukkan PIN Owner/Manajer</h3>
              <Button onClick={() => setDiscountOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="pin-dots">
              {[1, 2, 3, 4, 5, 6].map((x) => (
                <i key={x} />
              ))}
            </div>
            <div className="keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((x) => (
                <Button key={x}>{x}</Button>
              ))}
            </div>
            <label>
              <span>Nilai diskon</span>
              <div className="input-shell">
                <b>Rp</b>
                <input defaultValue="5000" />
              </div>
            </label>
            <Button
              className="primary-button"
              onClick={() => setDiscountOpen(false)}
            >
              Terapkan diskon
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}

function Cashier({ currentUser, onNavigate }: {
  currentUser?: AppUser
  onNavigate?: (page: Page) => void
} = {}) {
  const [tab, setTab] = useState<"Layanan" | "Produk">("Layanan")
  const [selectedBarber, setSelectedBarber] = useState("Seva")
  const [cart, setCart] = useState<CartLine[]>([
    { ...catalog[0], lineId: `${catalog[0].id}-Seva`, qty: 1, barber: "Seva" },
    {
      ...catalog[2],
      lineId: `${catalog[2].id}-Tatas`,
      qty: 1,
      barber: "Tatas",
    },
  ])
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState(catalog[0].price + catalog[2].price)
  const [qris, setQris] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [discountMode, setDiscountMode] = useState<"Nominal" | "Persen">(
    "Nominal",
  )
  const [discountDraft, setDiscountDraft] = useState(0)
  const [appliedDiscountPercent, setAppliedDiscountPercent] =
    useState<number | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [receipt, setReceipt] = useState(false)
  const activeBarbers = ["Seva", "Tatas", "Faisal", "Fadhil", "Ferdi"]
  const items = catalog.filter((x) => x.type === tab)
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const effectiveDiscount =
    appliedDiscountPercent === null
      ? discount
      : Math.round((total * appliedDiscountPercent) / 100)
  const payableTotal = Math.max(0, total - effectiveDiscount)
  const paid =
    method === "Tunai" ? cash : method === "QRIS" ? qris : cash + qris
  const shortage = Math.max(0, payableTotal - paid)
  const change =
    method === "QRIS" ? 0 : Math.max(0, cash - (payableTotal - qris))
  if (currentUser && currentUser.role !== "Kasir") {
    return (
      <div className="content">
        <div className="role-denied-box">
          <Icon name="lock" />
          <h3>Akses Dibatasi: Khusus Kasir</h3>
          <p>
            Halaman Kasir (POS input transaksi) hanya dapat diakses oleh peran{" "}
            <strong>Kasir</strong>. Peran Anda saat ini adalah{" "}
            <strong>{currentUser.role}</strong>.
          </p>
          {onNavigate && (
            <Button
              className="primary-button"
              onClick={() => onNavigate("dashboard")}
            >
              Kembali ke Beranda
            </Button>
          )}
        </div>
      </div>
    )
  }
  if (receipt)
    return (
      <ReceiptView
        cart={cart}
        subtotal={total}
        discount={effectiveDiscount}
        total={payableTotal}
        method={method}
        cash={cash}
        qris={qris}
        change={change}
        cashier={currentUser?.name ?? "Kasir"}
        onClose={() => setReceipt(false)}
      />
    )
  return (
    <div className="cashier-page">
      <section className="catalog">
        <div className="cashier-heading">
          <small>KASIR</small>
          <span>Pilih layanan</span>
        </div>
        <section className="barber-picker">
          <div className="barber-picker-label">
            <span className="item-icon">
              <Icon name="user" />
            </span>
            <small>Kapster aktif</small>
          </div>
          <div className="barber-options">
            {activeBarbers.map((barber) => (
              <Button
                className={`barber-btn ${selectedBarber === barber ? "active" : ""}`}
                key={barber}
                onClick={() => setSelectedBarber(barber)}
              >
                <i>{barber.charAt(0)}</i>
                <span>{barber}</span>
              </Button>
            ))}
          </div>
        </section>
        <div className="catalog-tools">
          <div className="segmented">
            <Button
              className={tab === "Layanan" ? "active" : ""}
              onClick={() => setTab("Layanan")}
            >
              Layanan
            </Button>
            <Button
              className={tab === "Produk" ? "active" : ""}
              onClick={() => setTab("Produk")}
            >
              Produk
            </Button>
          </div>
          <div className="search">
            <Icon name="search" />
            <input placeholder={`Cari ${tab.toLowerCase()}...`} />
          </div>
        </div>
        <div className="catalog-grid">
          {items.map((item) => (
            <Button
              className={`catalog-item ${item.stock === 0 ? "disabled" : ""}`}
              disabled={item.stock === 0}
              key={item.id}
              onClick={() =>
                setCart((c) => {
                  const found = c.find(
                    (x) => x.id === item.id && x.barber === selectedBarber,
                  )
                  return found
                    ? c.map((x) =>
                        x.lineId === found.lineId
                          ? { ...x, qty: x.qty + 1 }
                          : x,
                      )
                    : [
                        ...c,
                        {
                          ...item,
                          lineId: `${item.id}-${selectedBarber}`,
                          qty: 1,
                          barber: selectedBarber,
                        },
                      ]
                })
              }
            >
              <span className="item-icon">
                <Icon name={item.type === "Produk" ? "product" : "cashier"} />
              </span>
              <strong>{item.name}</strong>
              <b>{rupiah(item.price)}</b>
              {item.type === "Produk" && (
                <small>
                  <i>
                    {item.stock === 0 ? "Stok habis" : `Stok ${item.stock}`}
                  </i>
                  {item.consignment && <em>Titipan</em>}
                </small>
              )}
            </Button>
          ))}
        </div>
      </section>
      <aside className="cart">
        <div className="cart-panel">
          <div className="cart-tabs">
            <span className="cart-tab-active">
              <Icon name="receipt" /> Pesanan saat ini
            </span>
            <b className="cart-tab-count">
              {cart.reduce((sum, line) => sum + line.qty, 0)} item
            </b>
          </div>
          <div className="cart-lines">
            {cart.length === 0 ? (
              <div className="empty">
                <Icon name="receipt" />
                <strong>Keranjang kosong</strong>
                <span>Ketuk item untuk memulai.</span>
              </div>
            ) : (
              cart.map((line) => (
                <article key={line.lineId}>
                  <div>
                    <span className="cart-line-title">
                      <strong>{line.name}</strong>
                      <small>
                        <Icon name="user" /> Kapster: {line.barber}
                      </small>
                    </span>
                    <Button
                      onClick={() =>
                        setCart((c) =>
                          c.filter((x) => x.lineId !== line.lineId),
                        )
                      }
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                  <div>
                    <div className="stepper">
                      <Button
                        onClick={() =>
                          setCart((c) =>
                            c.map((x) =>
                              x.lineId === line.lineId
                                ? { ...x, qty: Math.max(1, x.qty - 1) }
                                : x,
                            ),
                          )
                        }
                      >
                        <Icon name="minus" />
                      </Button>
                      <span>{line.qty}</span>
                      <Button
                        onClick={() =>
                          setCart((c) =>
                            c.map((x) =>
                              x.lineId === line.lineId
                                ? { ...x, qty: x.qty + 1 }
                                : x,
                            ),
                          )
                        }
                      >
                        <Icon name="plus" />
                      </Button>
                    </div>
                    <b>{rupiah(line.price * line.qty)}</b>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="cart-total">
            <div>
              <span>Subtotal</span>
              <strong>{rupiah(total)}</strong>
            </div>
            <Button
              className="discount-button"
              onClick={() => {
                setDiscountDraft(
                  discountMode === "Persen"
                    ? (appliedDiscountPercent ?? 0)
                    : discount,
                )
                setDiscountOpen(!discountOpen)
              }}
            >
              <Icon name="lock" /> Beri diskon
            </Button>
            {discountOpen && (
              <div className="cart-discount-panel">
                <div className="discount-mode segmented">
                  {(["Nominal", "Persen"] as const).map((mode) => (
                    <Button
                      className={discountMode === mode ? "active" : ""}
                      key={mode}
                      onClick={() => {
                        setDiscountMode(mode)
                        setDiscountDraft(
                          mode === "Persen"
                            ? (appliedDiscountPercent ?? 0)
                            : discount,
                        )
                      }}
                    >
                      {mode === "Nominal" ? "Nominal (Rp)" : "Persen (%)"}
                    </Button>
                  ))}
                </div>
                <label>
                  <span>PIN Owner/Manajer</span>
                  <div className="input-shell">
                    <Icon name="lock" />
                    <input defaultValue="123456" type="password" />
                  </div>
                </label>
                <label>
                  <span>
                    {discountMode === "Persen"
                      ? "Persentase diskon"
                      : "Nilai diskon"}
                  </span>
                  <div className="input-shell">
                    <b>{discountMode === "Persen" ? "%" : "Rp"}</b>
                    <input
                      inputMode="numeric"
                      onChange={(e) =>
                        setDiscountDraft(
                          Number(e.target.value.replace(/\D/g, "")),
                        )
                      }
                      value={discountDraft}
                    />
                  </div>
                </label>
                <div>
                  <Button
                    className="text-button"
                    onClick={() => setDiscountOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    className="secondary-button"
                    onClick={() => {
                      const normalizedDiscount =
                        discountMode === "Persen"
                          ? Math.min(discountDraft, 100)
                          : Math.min(discountDraft, total)
                      const appliedDiscount =
                        discountMode === "Persen"
                          ? Math.round((total * normalizedDiscount) / 100)
                          : normalizedDiscount
                      const updatedTotal = Math.max(0, total - appliedDiscount)
                      setDiscount(appliedDiscount)
                      setAppliedDiscountPercent(
                        discountMode === "Persen" ? normalizedDiscount : null,
                      )
                      if (method === "Tunai") {
                        setCash(updatedTotal)
                        setQris(0)
                      } else if (method === "QRIS") {
                        setCash(0)
                        setQris(updatedTotal)
                      } else {
                        const cashPart = Math.min(cash, updatedTotal)
                        setCash(cashPart)
                        setQris(updatedTotal - cashPart)
                      }
                      setDiscountOpen(false)
                    }}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            )}
            {discount > 0 && (
              <div className="discount-applied">
                <span>
                  Diskon terotorisasi
                  {appliedDiscountPercent !== null &&
                    ` (${appliedDiscountPercent}%)`}
                </span>
                <strong>− {rupiah(effectiveDiscount)}</strong>
              </div>
            )}
            <div className="grand">
              <span>Total</span>
              <strong>{rupiah(payableTotal)}</strong>
            </div>
            <section className="cart-payment">
              <div className="cart-payment-heading">
                <small>Pembayaran</small>
                <Icon name="wallet" />
              </div>
              <div className="method-grid">
                {(["Tunai", "QRIS", "Gabungan"] as const).map((value) => (
                  <Button
                    className={method === value ? "active" : ""}
                    key={value}
                    onClick={() => {
                      setMethod(value)
                      if (value === "Tunai") {
                        setCash(payableTotal)
                        setQris(0)
                      } else if (value === "QRIS") {
                        setCash(0)
                        setQris(payableTotal)
                      } else {
                        const cashPart = Math.min(30000, payableTotal)
                        setCash(cashPart)
                        setQris(payableTotal - cashPart)
                      }
                    }}
                  >
                    <Icon name={value === "QRIS" ? "qris" : "cash"} />
                    <strong>{value}</strong>
                  </Button>
                ))}
              </div>
              <div className="money-fields">
                {method !== "QRIS" && (
                  <label>
                    <span>Jumlah Tunai</span>
                    <div className="input-shell">
                      <b>Rp</b>
                      <input
                        inputMode="numeric"
                        onChange={(e) =>
                          setCash(Number(e.target.value.replace(/\D/g, "")))
                        }
                        value={cash}
                      />
                    </div>
                  </label>
                )}
                {method !== "Tunai" && (
                  <label>
                    <span>Jumlah QRIS</span>
                    <div className="input-shell">
                      <b>Rp</b>
                      <input
                        inputMode="numeric"
                        onChange={(e) =>
                          setQris(Number(e.target.value.replace(/\D/g, "")))
                        }
                        value={qris}
                      />
                    </div>
                  </label>
                )}
              </div>
              {method !== "Tunai" && (
                <div className="cart-qris-note">
                  <Icon name="qris" /> Pastikan pembayaran QRIS sudah masuk.
                </div>
              )}
              <div
                className={`payment-result ${shortage ? "danger" : "success"}`}
              >
                <span>{shortage ? "Pembayaran kurang" : "Kembalian"}</span>
                <strong>
                  {shortage ? `Kurang ${rupiah(shortage)}` : rupiah(change)}
                </strong>
              </div>
              <Button
                className="primary-button cart-submit"
                disabled={!cart.length || shortage > 0}
                onClick={() => setReceipt(true)}
              >
                Bayar <Icon name="cash" />
              </Button>
            </section>
          </div>
        </div>
      </aside>
    </div>
  )
}

const transactions = [
  {
    id: "INV-291026-0084",
    time: "10.24",
    item: "Haircut + Shaving",
    barber: "Seva",
    method: "Gabungan",
    total: 60000,
    status: "Lunas",
  },
  {
    id: "INV-291026-0083",
    time: "09.46",
    item: "Hair Coloring",
    barber: "Tatas",
    method: "QRIS",
    total: 120000,
    status: "Lunas",
  },
  {
    id: "INV-291026-0082",
    time: "09.05",
    item: "Haircut + Produk",
    barber: "Faisal",
    method: "Tunai",
    total: 110000,
    status: "BATAL",
  },
  {
    id: "INV-291026-0041",
    time: "08.51",
    item: "Haircut + Cuci",
    barber: "Seva",
    method: "Tunai",
    total: 50000,
    status: "Manual",
  },
]

function HistoryPage({ currentUser }: { currentUser?: AppUser } = {}) {
  const [selected, setSelected] = useState(transactions[0])
  const [action, setAction] = useState<null | "void" | "restore">(null)
  return (
    <div className="content">
      <PageTitle eyebrow="Transaksi" title="Riwayat transaksi" />
      <div className="filters">
        <div className="input-shell">
          <Icon name="calendar" />
          <input defaultValue="2026-10-29" type="date" />
        </div>
        <select defaultValue="Semua kapster">
          <option>Semua kapster</option>
          {["Seva", "Tatas", "Faisal", "Fadhil", "Ferdi"].map((barber) => (
            <option key={barber}>{barber}</option>
          ))}
        </select>
      </div>
      <div className="master-detail">
        <section className="panel transaction-list">
          <div className="table-head">
            <span>Nomor nota</span>
            <span>Waktu</span>
            <span>Item</span>
            <span>Kapster</span>
            <span>Metode</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {transactions.map((tx) => (
            <Button
              className={`transaction-row ${
                tx.status === "BATAL" ? "voided" : ""
              } ${selected.id === tx.id ? "selected" : ""}`}
              key={tx.id}
              onClick={() => setSelected(tx)}
            >
              <strong>{tx.id}</strong>
              <span>{tx.time}</span>
              <span>{tx.item}</span>
              <span>{tx.barber}</span>
              <span>{tx.method}</span>
              <strong>{rupiah(tx.total)}</strong>
              <i className={`chip ${tx.status.toLowerCase()}`}>{tx.status}</i>
              {tx.status === "BATAL" && (
                <small>
                  Dibatalkan oleh Tatas, 29 Okt 09.12, alasan: salah input
                </small>
              )}
            </Button>
          ))}
        </section>
        <aside className="panel detail">
          <PageTitle eyebrow="Detail transaksi" title={selected.id} />
          {selected.status === "BATAL" && (
            <div className="danger-banner">
              <Icon name="alert" /> Transaksi dibatalkan · alasan: salah input
            </div>
          )}
          <h3>Item transaksi</h3>
          <div className="detail-line">
            <span>{selected.item}</span>
            <strong>{rupiah(selected.total)}</strong>
          </div>
          <div className="detail-cards">
            <div>
              <Icon name="cash" />
              <small>Pembayaran</small>
              <strong>{selected.method}</strong>
            </div>
            <div>
              <Icon name="user" />
              <small>Kapster</small>
              <strong>{selected.barber}</strong>
            </div>
            <div>
              <Icon name="wallet" />
              <small>Komisi</small>
              <strong>Rp 24.000</strong>
            </div>
          </div>
          <h3>Riwayat aksi</h3>
          <div className="timeline">
            <i />
            <span>
              <strong>Transaksi dibuat</strong>
              <small>Tatas · 29 Okt 2026, {selected.time}</small>
            </span>
          </div>
          {currentUser?.role === "Kasir" && selected.status === "BATAL" ? (
            <div className="danger-banner" style={{ marginTop: 12 }}>
              <Icon name="lock" /> Pemulihan transaksi batal hanya dapat
              dilakukan oleh Owner atau Manajer (KK-14b).
            </div>
          ) : (
            <Button
              className={
                selected.status === "BATAL" ? "primary-button" : "danger-button"
              }
              onClick={() =>
                setAction(selected.status === "BATAL" ? "restore" : "void")
              }
            >
              <Icon name={selected.status === "BATAL" ? "restore" : "close"} />
              {selected.status === "BATAL"
                ? "Pulihkan transaksi"
                : "Batalkan transaksi"}
            </Button>
          )}
        </aside>
      </div>
      {action && (
        <ReasonDialog
          title={
            action === "restore" ? "Pulihkan transaksi?" : "Batalkan transaksi?"
          }
          warning={
            action === "restore"
              ? "Laporan periode lama akan berubah."
              : "Data tetap tersimpan dalam riwayat."
          }
          onClose={() => setAction(null)}
        />
      )}
    </div>
  )
}

function ReasonDialog({
  title,
  warning,
  onClose,
}: {
  title: string
  warning: string
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="modal-overlay">
      <section className="reason-dialog">
        <header>
          <div>
            <p className="eyebrow">Aksi berisiko</p>
            <h2>{title}</h2>
          </div>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <div className="info-banner">
          <Icon name="alert" />
          {warning}
        </div>
        <label>
          <span>
            Alasan <b>Wajib</b>
          </span>
          <textarea
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan..."
            value={reason}
          />
        </label>
        <footer>
          <Button className="secondary-button" onClick={onClose}>
            Kembali
          </Button>
          <Button
            className="danger-button"
            disabled={reason.length < 5}
            onClick={onClose}
          >
            Konfirmasi
          </Button>
        </footer>
      </section>
    </div>
  )
}

function ManualPage() {
  const [note, setNote] = useState("")
  const duplicate = note === "INV-291026-0084"
  return (
    <div className="content narrow">
      <PageTitle eyebrow="Transaksi dari buku" title="Input susulan" />
      <section className="panel form-panel">
        <h3>Informasi transaksi</h3>
        <div className="form-grid manual-info-grid">
          <label>
            <span>Tanggal transaksi</span>
            <input max="2026-10-29" defaultValue="2026-10-28" type="date" />
            <small>Tanggal masa depan dinonaktifkan.</small>
          </label>
          <label>
            <span>Nomor nota dari buku</span>
            <input
              className={duplicate ? "input-error" : ""}
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              placeholder="BUKU-291026-01"
              value={note}
            />
            {duplicate && (
              <small className="error-text">Nomor nota sudah dipakai</small>
            )}
          </label>
        </div>
      </section>
      <section className="panel form-panel">
        <div className="section-title">
          <h3>Item dan kapster</h3>
          <Button className="secondary-button">
            <Icon name="plus" /> Tambah baris
          </Button>
        </div>
        {["Haircut", "Shaving"].map((x, i) => (
          <div className="manual-row" key={x}>
            <span>{i + 1}</span>
            <select defaultValue={x}>
              <option>Haircut</option>
              <option>Shaving</option>
              <option>Treatment</option>
            </select>
            <select>
              <option>{i ? "Tatas" : "Seva"}</option>
              <option>Faisal</option>
              <option>Fadhil</option>
              <option>Ferdi</option>
            </select>
            <input defaultValue="1" type="number" />
            <strong>{i ? "Rp 25.000" : "Rp 40.000"}</strong>
            <Button>
              <Icon name="trash" />
            </Button>
          </div>
        ))}
      </section>
      <section className="panel form-panel">
        <h3>Pembayaran</h3>
        <div className="payment-form-row">
          <div className="segmented">
            <Button className="active">Tunai</Button>
            <Button>QRIS</Button>
            <Button>Gabungan</Button>
          </div>
          <div className="input-shell">
            <b>Rp</b>
            <input defaultValue="65000" />
          </div>
          <div className="manual-total">
            <small>Total transaksi</small>
            <strong>Rp 65.000</strong>
          </div>
        </div>
      </section>
      <div className="sticky-submit">
        <span>
          <b>MANUAL</b> Akan ditandai di Riwayat dan laporan.
        </span>
        <Button
          className="primary-button"
          disabled={duplicate || note.length < 6}
        >
          Simpan rekap manual
        </Button>
      </div>
    </div>
  )
}

const expenses = [
  ["29 Okt", "Perlengkapan", "Pisau cukur dan sarung tangan", 485000, "Aktif"],
  ["28 Okt", "Listrik", "Token listrik Oktober", 750000, "Aktif"],
  ["26 Okt", "Air", "Tagihan PDAM Oktober", 215000, "Aktif"],
  ["24 Okt", "Sewa", "Sewa tempat bulan November", 3500000, "Aktif"],
  ["22 Okt", "Lain-lain", "Konsumsi rapat tim", 280000, "BATAL"],
] as const
function ExpensesPage() {
  const [form, setForm] = useState(false)
  return (
    <div className="content">
      <PageTitle
        eyebrow="Operasional"
        title="Pengeluaran"
        action={
          <Button className="primary-button" onClick={() => setForm(true)}>
            <Icon name="plus" /> Catat pengeluaran
          </Button>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="expense"
          label="Total bulan ini"
          tone="brass"
          value="Rp 5.840.000"
          detail="Oktober 2026"
        />
      </div>
      <section className="panel list-panel">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Cari keterangan..." />
          </div>
          <select>
            <option>Semua kategori</option>
          </select>
        </div>
        <div className="expense-head">
          <span>Tanggal</span>
          <span>Kategori</span>
          <span>Keterangan</span>
          <span>Jumlah</span>
          <span>Status</span>
          <span />
        </div>
        {expenses.map((row) => (
          <div
            className={`expense-row ${row[4] === "BATAL" ? "voided" : ""}`}
            key={row[2]}
          >
            <span>{row[0]}</span>
            <strong>{row[1]}</strong>
            <span>
              {row[2]}
              {row[4] === "BATAL" && (
                <small>Dibatalkan oleh Seva · salah nominal</small>
              )}
            </span>
            <strong>{rupiah(row[3])}</strong>
            <i className={`chip ${row[4].toLowerCase()}`}>{row[4]}</i>
            {row[4] === "BATAL" ? (
              <Button className="secondary-button">
                <Icon name="restore" /> Pulihkan
              </Button>
            ) : (
              <Button>
                <Icon name="arrow" />
              </Button>
            )}
          </div>
        ))}
      </section>
      {form && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(e) => {
              e.preventDefault()
              setForm(false)
            }}
          >
            <header>
              <h2>Catat pengeluaran</h2>
              <Button onClick={() => setForm(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kategori</span>
              <select>
                <option>Listrik</option>
                <option>Air</option>
                <option>Sewa</option>
                <option>Perlengkapan</option>
                <option>Lain-lain</option>
              </select>
            </label>
            <label>
              <span>Jumlah</span>
              <div className="input-shell">
                <b>Rp</b>
                <input placeholder="0" />
              </div>
            </label>
            <label>
              <span>Keterangan</span>
              <textarea placeholder="Keterangan pengeluaran..." />
            </label>
            <label>
              <span>Tanggal</span>
              <input defaultValue="2026-10-29" type="date" />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setForm(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

const staffSalary = [
  ["Seva", "SV", 47, 1880000, 210000, 350000, "Belum dibayar"],
  ["Tatas", "TT", 39, 1560000, 140000, 0, "Dibayar"],
  ["Faisal", "FS", 35, 1400000, 70000, 500000, "Belum dibayar"],
  ["Fadhil", "FH", 42, 1680000, 175000, 200000, "Belum dibayar"],
  ["Ferdi", "FR", 38, 1520000, 150000, 100000, "Belum dibayar"],
] as const
function PayrollPage() {
  const [tab, setTab] = useState<"Gaji" | "Kasbon">("Gaji")
  const [pay, setPay] = useState<string | null>(null)
  return (
    <div className="content">
      <div className="segmented page-segment">
        <Button
          className={tab === "Gaji" ? "active" : ""}
          onClick={() => setTab("Gaji")}
        >
          Gaji
        </Button>
        <Button
          className={tab === "Kasbon" ? "active" : ""}
          onClick={() => setTab("Kasbon")}
        >
          Kasbon
        </Button>
      </div>
      {tab === "Gaji" ? (
        <>
          <section className="salary-hero">
            <div>
              <p className="eyebrow">Periode pembayaran</p>
              <h2>Oktober 2026</h2>
              <div className="segmented dark-segment">
                <Button>1–15 Okt</Button>
                <Button className="active">16–31 Okt</Button>
              </div>
            </div>
            <div>
              <small>Total gaji bersih</small>
              <strong>Rp 6.015.000</strong>
              <small>1/4 kapster dibayar</small>
            </div>
          </section>
          <div className="salary-grid">
            {staffSalary.map((x) => (
              <article className="salary-card" key={x[0]}>
                <header>
                  <span>{x[1]}</span>
                  <div>
                    <h3>{x[0]}</h3>
                    <small>{x[2]} pelanggan</small>
                  </div>
                  <i
                    className={`chip ${
                      x[6] === "Dibayar" ? "lunas" : "manual"
                    }`}
                  >
                    {x[6]}
                  </i>
                </header>
                <dl>
                  <div>
                    <dt>Komisi layanan</dt>
                    <dd>{rupiah(x[3])}</dd>
                  </div>
                  <div>
                    <dt>Komisi produk</dt>
                    <dd>{rupiah(x[4])}</dd>
                  </div>
                  <div className="deduct">
                    <dt>Potongan kasbon</dt>
                    <dd>− {rupiah(x[5])}</dd>
                  </div>
                </dl>
                <footer>
                  <span>
                    <small>Gaji bersih</small>
                    <strong>{rupiah(x[3] + x[4] - x[5])}</strong>
                  </span>
                  {x[6] !== "Dibayar" && (
                    <Button
                      className="primary-button"
                      onClick={() => setPay(x[0])}
                    >
                      Bayar
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
          <div className="pending-grid">
            <article>
              <Icon name="lock" />
              <span>
                <strong>Target & proteksi 6/8 jam</strong>
                <small>Menunggu konfirmasi klien</small>
              </span>
            </article>
            <article>
              <Icon name="lock" />
              <span>
                <strong>Komisi “1,5”</strong>
                <small>Menunggu konfirmasi klien</small>
              </span>
            </article>
          </div>
          <section className="panel history-panel">
            <PageTitle eyebrow="Jejak pembayaran" title="Riwayat pembayaran" />
            <div className="history-payment">
              <span>DS</span>
              <strong>Tatas</strong>
              <span>29 Okt 2026</span>
              <b>Rp 1.700.000</b>
              <Button className="danger-link">Batalkan pembayaran</Button>
            </div>
          </section>
        </>
      ) : (
        <KasbonTab />
      )}
      {pay && (
        <div className="modal-overlay">
          <section className="simple-modal">
            <header>
              <h2>Bayar {pay}</h2>
              <Button onClick={() => setPay(null)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Tanggal pembayaran</span>
              <input defaultValue="2026-10-29" type="date" />
            </label>
            <div className="pay-preview">
              <div>
                <span>Komisi layanan + produk</span>
                <strong>Rp 2.090.000</strong>
              </div>
              <div>
                <span>Potongan kasbon otomatis</span>
                <strong>− Rp 350.000</strong>
              </div>
              <div>
                <span>Gaji bersih</span>
                <strong>Rp 1.740.000</strong>
              </div>
            </div>
            <footer>
              <Button className="secondary-button" onClick={() => setPay(null)}>
                Batal
              </Button>
              <Button className="primary-button" onClick={() => setPay(null)}>
                Konfirmasi
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}

function KasbonTab() {
  const [add, setAdd] = useState(false)
  return (
    <>
      <PageTitle
        eyebrow="Saldo berjalan"
        title="Kasbon kapster"
        action={
          <Button className="primary-button" onClick={() => setAdd(true)}>
            <Icon name="plus" /> Catat kasbon
          </Button>
        }
      />
      <div className="advance-grid">
        {[
          ["Seva", "SV", 350000],
          ["Tatas", "TT", 0],
          ["Faisal", "FS", 500000],
          ["Fadhil", "FH", 200000],
          ["Ferdi", "FR", 100000],
        ].map((x) => (
          <article key={x[0]}>
            <span>{x[1]}</span>
            <div>
              <strong>{x[0]}</strong>
              <small>Sisa kasbon</small>
              <b>{rupiah(Number(x[2]))}</b>
            </div>
          </article>
        ))}
      </div>
      <section className="panel list-panel">
        <div className="advance-row">
          <strong>Seva</strong>
          <span>24 Okt 2026</span>
          <span>Keperluan keluarga</span>
          <b>Rp 350.000</b>
          <i className="chip lunas">Aktif</i>
          <Button className="danger-link">Batalkan</Button>
        </div>
        <div className="advance-row">
          <strong>Faisal</strong>
          <span>20 Okt 2026</span>
          <span>Perbaikan kendaraan</span>
          <b>Rp 500.000</b>
          <i className="chip lunas">Aktif</i>
          <Button className="danger-link">Batalkan</Button>
        </div>
      </section>
      {add && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(e) => {
              e.preventDefault()
              setAdd(false)
            }}
          >
            <header>
              <h2>Catat kasbon</h2>
              <Button onClick={() => setAdd(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kapster</span>
              <select>
                <option>Seva</option>
                <option>Faisal</option>
              </select>
            </label>
            <label>
              <span>Jumlah</span>
              <div className="input-shell">
                <b>Rp</b>
                <input />
              </div>
            </label>
            <label>
              <span>Catatan</span>
              <textarea />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setAdd(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </>
  )
}

function MySalary() {
  return (
    <div className="mobile-content">
      <PageTitle
        eyebrow="Pendapatan pribadi"
        title="Gaji Saya"
        action={
          <Button className="secondary-button">
            <Icon name="calendar" />
            16–31 Okt
          </Button>
        }
      />
      <article className="my-salary-hero">
        <span>Komisi periode ini</span>
        <strong>Rp 2.090.000</strong>
        <p>47 pelanggan · 16–31 Oktober</p>
        <i>
          <b />
        </i>
        <small>Dihitung server saat gaji dibayar</small>
      </article>
      <section className="panel salary-breakdown">
        <PageTitle eyebrow="Perincian periode" title="Rincian pendapatan" />
        {[
          ["cashier", "Komisi layanan", 1880000],
          ["product", "Komisi produk", 210000],
          ["minus", "Potongan kasbon", -350000],
          ["wallet", "Sisa kasbon", 0],
        ].map((x) => (
          <div key={String(x[1])}>
            <span>
              <Icon name={x[0] as IconName} />
            </span>
            <strong>{x[1]}</strong>
            <b>
              {Number(x[2]) < 0
                ? `− ${rupiah(Math.abs(Number(x[2])))}`
                : rupiah(Number(x[2]))}
            </b>
          </div>
        ))}
        <footer>
          <span>Estimasi diterima</span>
          <strong>Rp 1.740.000</strong>
        </footer>
      </section>
      <section className="panel customer-list">
        <PageTitle
          eyebrow="Hari ini · 29 Okt"
          title="Pelanggan yang dikerjakan"
        />
        {[
          ["10.24", "Haircut", 16000],
          ["11.08", "Haircut + Cuci", 20000],
          ["12.42", "Shaving", 10000],
          ["14.16", "Treatment", 24000],
          ["16.37", "Free Style Dust", 10000],
        ].map((x) => (
          <div key={x[0]}>
            <span>{x[0]}</span>
            <i>
              <Icon name={x[1] === "Free Style Dust" ? "product" : "cashier"} />
            </i>
            <strong>{x[1]}</strong>
            <b>+{rupiah(Number(x[2]))}</b>
          </div>
        ))}
      </section>
      <div className="privacy">
        <Icon name="lock" /> Hanya data komisi dan transaksi milik akun Anda
        yang ditampilkan.
      </div>
    </div>
  )
}

const barberReport = [
  ["Seva", 124, 12480000, 4992000],
  ["Tatas", 97, 9730000, 3892000],
  ["Faisal", 57, 6040000, 2416000],
  ["Fadhil", 111, 11250000, 4500000],
  ["Ferdi", 86, 8750000, 3500000],
]
function ReportsPage({ currentUser }: { currentUser?: AppUser } = {}) {
  const [wa, setWa] = useState(false)
  return (
    <div className="content">
      <div className="report-toolbar">
        <div className="segmented">
          <Button>Harian</Button>
          <Button className="active">Bulanan</Button>
        </div>
        <select>
          <option>Oktober 2026</option>
        </select>
        <div>
          <Button className="secondary-button">Excel</Button>
          <Button className="secondary-button">PDF</Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value="Rp 48.750.000"
          detail="Tunai 31,42 jt · QRIS 17,33 jt"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 8.420.000"
          detail="Oktober 2026"
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value="Rp 18.650.000"
          detail="Layanan + produk"
        />
        <Kpi
          icon="wallet"
          label="Sisa Owner"
          tone="dark"
          value="Rp 21.680.000"
          detail="Setelah semua biaya"
        />
      </div>
      <section className="panel report-chart">
        <PageTitle eyebrow="Tren pemasukan" title="Pemasukan per hari" />
        <div className="bar-chart large">
          {[42, 58, 46, 72, 62, 84, 54, 91, 66, 78, 96, 74, 82, 59, 89, 71].map(
            (_, i) => (
              <span className={`chart-bar b${(i % 12) + 1}`} key={i}>
                <i />
                <b />
              </span>
            ),
          )}
        </div>
      </section>
      <section className="panel report-table">
        <PageTitle eyebrow="Kinerja tim" title="Rincian per kapster" />
        <div className="report-head">
          <span>Kapster</span>
          <span>Pelanggan</span>
          <span>Omzet</span>
          <span>Komisi</span>
        </div>
        {barberReport.map((x) => (
          <div className="report-row" key={x[0]}>
            <strong>{x[0]}</strong>
            <span>{x[1]} orang</span>
            <b>{rupiah(Number(x[2]))}</b>
            <b>{rupiah(Number(x[3]))}</b>
          </div>
        ))}
      </section>
      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Bulanan"
          text={`Pemasukan: Rp 48.750.000\nPengeluaran: Rp 8.420.000\nKomisi: Rp 18.650.000\nSisa Owner: Rp 21.680.000`}
        />
      )}
    </div>
  )
}

function WhatsAppDialog({
  onClose,
  title,
  text,
}: {
  onClose: () => void
  title: string
  text: string
}) {
  return (
    <div className="modal-overlay">
      <section className="simple-modal whatsapp-modal">
        <header>
          <h2>{title}</h2>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <pre>
          *Eastville Barbershop*{"\n"}
          {text}
          {"\n\n"}Penjualan batal tidak dihitung.
        </pre>
        <footer>
          <Button className="secondary-button" onClick={onClose}>
            Kembali
          </Button>
          <Button className="whatsapp-button" onClick={onClose}>
            <Icon name="whatsapp" /> Buka WhatsApp
          </Button>
        </footer>
      </section>
    </div>
  )
}

interface ProductTransactionRecord {
  id: string
  time: string
  product: string
  qty: number
  unitPrice: number
  totalOmzet: number
  barber: string
  seller: string
  barberShare: number
  sellerShare: number
  eastvilleShare: number
  status: "Lunas" | "Batal"
  voidReason?: string
  voidBy?: string
  voidAt?: string
}

const INITIAL_PRODUCT_TRANSACTIONS: ProductTransactionRecord[] = [
  {
    id: "TRX-P29-001",
    time: "29 Okt 10.15",
    product: "Free Style Dust",
    qty: 2,
    unitPrice: 70000,
    totalOmzet: 140000,
    barber: "Seva",
    seller: "HAIRPRO Official",
    barberShare: 14000,
    sellerShare: 84000,
    eastvilleShare: 42000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-002",
    time: "29 Okt 11.40",
    product: "Hair Paste Pomade",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Tatas",
    seller: "HAIRPRO Official",
    barberShare: 10000,
    sellerShare: 40000,
    eastvilleShare: 20000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-003",
    time: "29 Okt 13.05",
    product: "Water Based Pomade",
    qty: 2,
    unitPrice: 70000,
    totalOmzet: 140000,
    barber: "Faisal",
    seller: "Mitra Grooming",
    barberShare: 14000,
    sellerShare: 84000,
    eastvilleShare: 42000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-004",
    time: "29 Okt 14.20",
    product: "Miracle Treatment",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Fadhil",
    seller: "Mitra Grooming",
    barberShare: 10000,
    sellerShare: 40000,
    eastvilleShare: 20000,
    status: "Batal",
    voidReason: "Salah input varian produk oleh kasir",
    voidBy: "Dian Setiawan (Manajer)",
    voidAt: "29 Okt 14.28",
  },
  {
    id: "TRX-P29-005",
    time: "29 Okt 15.10",
    product: "Free Style Dust",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Ferdi",
    seller: "HAIRPRO Official",
    barberShare: 7000,
    sellerShare: 42000,
    eastvilleShare: 21000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-006",
    time: "29 Okt 16.35",
    product: "Hair Paste Pomade",
    qty: 2,
    unitPrice: 70000,
    totalOmzet: 140000,
    barber: "Seva",
    seller: "HAIRPRO Official",
    barberShare: 20000,
    sellerShare: 80000,
    eastvilleShare: 40000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-007",
    time: "28 Okt 17.50",
    product: "Water Based Pomade",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Tatas",
    seller: "Mitra Grooming",
    barberShare: 7000,
    sellerShare: 42000,
    eastvilleShare: 21000,
    status: "Batal",
    voidReason: "Pelanggan membatalkan pembelian sebelum bayar",
    voidBy: "Ardi Pradana (Owner)",
    voidAt: "28 Okt 17.58",
  },
]

function ProductReports({ currentUser }: { currentUser?: AppUser } = {}) {
  const [role, setRole] = useState<"Owner" | "Kapster">(
    currentUser?.role === "Kapster" ? "Kapster" : "Owner",
  )
  const [wa, setWa] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Lunas" | "Batal">("Semua")
  const [activeTab, setActiveTab] = useState<"transaksi" | "koreksi" | "ringkasan">("transaksi")
  const [txList] = useState<ProductTransactionRecord[]>(INITIAL_PRODUCT_TRANSACTIONS)

  const validTransactions = useMemo(
    () => txList.filter((tx) => tx.status === "Lunas"),
    [txList],
  )

  const filteredTransactions = useMemo(() => {
    if (statusFilter === "Semua") return txList
    return txList.filter((tx) => tx.status === statusFilter)
  }, [txList, statusFilter])

  const totalOmzet = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.totalOmzet, 0),
    [validTransactions],
  )
  const totalBarber = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.barberShare, 0),
    [validTransactions],
  )
  const totalSeller = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.sellerShare, 0),
    [validTransactions],
  )
  const totalEastville = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.eastvilleShare, 0),
    [validTransactions],
  )

  const voidCount = useMemo(
    () => txList.filter((tx) => tx.status === "Batal").length,
    [txList],
  )
  const voidAmount = useMemo(
    () =>
      txList
        .filter((tx) => tx.status === "Batal")
        .reduce((acc, tx) => acc + tx.totalOmzet, 0),
    [txList],
  )

  if (role === "Kapster" || currentUser?.role === "Kapster")
    return (
      <div className="mobile-content">
        <div className="role-preview">
          <span>Pratinjau peran</span>
          <select
            onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
            value={role}
          >
            <option>Owner</option>
            <option>Kapster</option>
          </select>
        </div>
        <div className="segmented full">
          <Button>Harian</Button>
          <Button>Mingguan</Button>
          <Button className="active">Bulanan</Button>
        </div>
        <article className="my-salary-hero">
          <span>Komisi produk saya</span>
          <strong>Rp 520.000</strong>
          <p>44 unit · 18 transaksi</p>
        </article>
        <section className="panel customer-list">
          <PageTitle eyebrow="Penjualan pribadi" title="Komisi per produk" />
          {[
            ["Free Style Dust", 10000],
            ["Hair Paste Pomade", 20000],
            ["Water Based Pomade", 10000],
            ["Miracle Treatment", 10000],
          ].map((x) => (
            <div key={x[0]}>
              <i>
                <Icon name="product" />
              </i>
              <strong>{x[0]}</strong>
              <b>+{rupiah(Number(x[1]))}</b>
            </div>
          ))}
        </section>
        <div className="privacy">
          <Icon name="lock" /> Bagian seller dan Eastville tidak ditampilkan.
        </div>
      </div>
    )
  return (
    <div className="content">
      <div className="report-toolbar">
        <div className="segmented">
          <Button>Harian</Button>
          <Button>Mingguan</Button>
          <Button className="active">Bulanan</Button>
        </div>
        <div className="role-preview">
          <span>Peran</span>
          <select
            onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
            value={role}
          >
            <option>Owner</option>
            <option>Kapster</option>
          </select>
        </div>
        <div>
          <Button className="secondary-button">Excel</Button>
          <Button className="secondary-button">PDF</Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid">
        <Kpi
          icon="product"
          label="Total Omzet Produk"
          tone="sage"
          value={rupiah(totalOmzet)}
          detail={`${validTransactions.length} transaksi lunas`}
        />
        <Kpi
          icon="people"
          label="Total Komisi Capster"
          tone="brass"
          value={rupiah(totalBarber)}
          detail={`${totalOmzet > 0 ? ((totalBarber / totalOmzet) * 100).toFixed(1) : 0}% bagian capster`}
        />
        <Kpi
          icon="home"
          label="Total Bagian Seller"
          tone="amber"
          value={rupiah(totalSeller)}
          detail={`${totalOmzet > 0 ? ((totalSeller / totalOmzet) * 100).toFixed(1) : 0}% bagian pemasok`}
        />
        <Kpi
          icon="wallet"
          label="Total Bagian Eastville"
          tone="dark"
          value={rupiah(totalEastville)}
          detail={`${totalOmzet > 0 ? ((totalEastville / totalOmzet) * 100).toFixed(1) : 0}% sisa barbershop`}
        />
      </div>

      <div className="void-protection-banner">
        <Icon name="check" />
        <span>
          <strong>Sistem Proteksi Omzet & Komisi Aktif:</strong> Transaksi yang dibatalkan/void otomatis dikecualikan dari perhitungan total omzet dan komisi (tercatat {voidCount} void: {rupiah(voidAmount)}).
        </span>
      </div>

      <div className="report-subnav-row">
        <div className="segmented">
          <Button
            className={activeTab === "transaksi" ? "active" : ""}
            onClick={() => setActiveTab("transaksi")}
          >
            <Icon name="receipt" /> Detail Transaksi Produk
          </Button>
          <Button
            className={activeTab === "koreksi" ? "active" : ""}
            onClick={() => setActiveTab("koreksi")}
          >
            <Icon name="history" /> Riwayat Koreksi & Void ({voidCount})
          </Button>
          <Button
            className={activeTab === "ringkasan" ? "active" : ""}
            onClick={() => setActiveTab("ringkasan")}
          >
            <Icon name="chart" /> Ringkasan Performa
          </Button>
        </div>
      </div>

      {activeTab === "transaksi" && (
        <section className="panel product-tx-panel">
          <div className="product-tx-toolbar">
            <PageTitle
              eyebrow="Rincian Transaksi"
              title="Pembagian Komisi Otomatis Per Transaksi"
            />
            <div className="tx-filter-group">
              <span className="filter-label">Filter Status:</span>
              <div className="segmented">
                {(["Semua", "Lunas", "Batal"] as const).map((s) => (
                  <Button
                    key={s}
                    className={statusFilter === s ? "active" : ""}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "Semua"
                      ? "Semua"
                      : s === "Lunas"
                        ? "Lunas (Sukses)"
                        : "Dibatalkan (Void)"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="product-tx-table-wrap">
            <div className="product-tx-head">
              <span>Nota & Waktu</span>
              <span>Produk</span>
              <span>Capster</span>
              <span>Seller / Pemasok</span>
              <span>Total Omzet</span>
              <span>Bagian Capster</span>
              <span>Bagian Seller</span>
              <span>Bagian Eastville</span>
              <span>Status</span>
            </div>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`product-tx-row ${tx.status === "Batal" ? "voided" : ""}`}
              >
                <span className="tx-meta-col">
                  <strong>{tx.id}</strong>
                  <small>{tx.time}</small>
                </span>
                <span>
                  <strong>{tx.product}</strong>
                  <small>{tx.qty} unit @ {rupiah(tx.unitPrice)}</small>
                </span>
                <span>{tx.barber}</span>
                <span>{tx.seller}</span>
                <strong className={tx.status === "Batal" ? "strike-text" : ""}>
                  {rupiah(tx.totalOmzet)}
                </strong>
                <span className={`share-cell barber-cell ${tx.status === "Batal" ? "strike-text" : ""}`}>
                  {rupiah(tx.barberShare)}
                </span>
                <span className={`share-cell seller-cell ${tx.status === "Batal" ? "strike-text" : ""}`}>
                  {rupiah(tx.sellerShare)}
                </span>
                <span className={`share-cell eastville-cell ${tx.status === "Batal" ? "strike-text" : ""}`}>
                  {rupiah(tx.eastvilleShare)}
                </span>
                <span>
                  <i className={`chip ${tx.status === "Lunas" ? "lunas" : "batal"}`}>
                    {tx.status === "Lunas" ? "Lunas" : "Void / Batal"}
                  </i>
                </span>
                {tx.status === "Batal" && (
                  <div className="void-reason-note">
                    <Icon name="alert" /> Void oleh {tx.voidBy} ({tx.voidAt}): {tx.voidReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "koreksi" && (
        <section className="panel correction-panel">
          <PageTitle
            eyebrow="Audit & Kontrol"
            title="Riwayat Koreksi & Pembatalan Transaksi Produk"
          />
          <p className="correction-desc">
            Daftar transaksi produk yang dibatalkan oleh Owner atau Manajer. Transaksi yang dibatalkan dipastikan tidak masuk ke dalam perhitungan omzet maupun komisi capster/seller.
          </p>
          <div className="correction-table">
            <div className="correction-head">
              <span>Nota & Waktu</span>
              <span>Produk</span>
              <span>Nilai Dibatalkan</span>
              <span>Diotorisasi Oleh</span>
              <span>Alasan Pembatalan / Koreksi</span>
              <span>Status</span>
            </div>
            {txList
              .filter((tx) => tx.status === "Batal")
              .map((tx) => (
                <div key={tx.id} className="correction-row">
                  <span>
                    <strong>{tx.id}</strong>
                    <small>{tx.voidAt || tx.time}</small>
                  </span>
                  <span>
                    <strong>{tx.product}</strong>
                    <small>{tx.qty} unit · {tx.seller}</small>
                  </span>
                  <b className="void-amount">{rupiah(tx.totalOmzet)}</b>
                  <span>{tx.voidBy || "Manajer"}</span>
                  <span className="void-reason-text">{tx.voidReason || "Salah input"}</span>
                  <span>
                    <i className="chip batal">Dibatalkan</i>
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {activeTab === "ringkasan" && (
        <>
          <section className="panel distribution">
            <div>
              <PageTitle
                eyebrow="Pembagian tiga pihak"
                title="Distribusi hasil penjualan"
              />
              <div className="legend">
                <span>
                  <i className="sage-dot" />
                  Capster {totalOmzet > 0 ? ((totalBarber / totalOmzet) * 100).toFixed(1) : 0}%
                </span>
                <span>
                  <i className="brass-dot" />
                  Seller {totalOmzet > 0 ? ((totalSeller / totalOmzet) * 100).toFixed(1) : 0}%
                </span>
                <span>
                  <i className="dark-dot" />
                  Eastville {totalOmzet > 0 ? ((totalEastville / totalOmzet) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            <div className="donut">
              <span>
                <small>Total dibagi</small>
                <strong>{rupiah(totalOmzet)}</strong>
              </span>
            </div>
            <div className="success-banner">
              <Icon name="check" />
              <span>
                <strong>Hanya penjualan aktif</strong>
                <small>Penjualan batal tidak dihitung</small>
              </span>
            </div>
          </section>
          <div className="product-detail-grid">
            <ProductDetail />
            <CompactDetail
              title="Per kapster"
              icon="user"
              rows={[
                ["Seva", "44 unit", "Rp 520.000"],
                ["Tatas", "36 unit", "Rp 420.000"],
                ["Faisal", "29 unit", "Rp 330.000"],
                ["Fadhil", "38 unit", "Rp 410.000"],
                ["Ferdi", "31 unit", "Rp 360.000"],
              ]}
            />
            <CompactDetail
              title="Per seller"
              icon="home"
              rows={[
                ["HAIRPRO Official", "118 unit", "Rp 5.840.000"],
                ["Mitra Grooming", "29 unit", "Rp 1.160.000"],
                ["Eastville Internal", "8 unit", "Rp 420.000"],
              ]}
            />
          </div>
        </>
      )}
      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Produk"
          text={`Total Omzet produk: ${rupiah(totalOmzet)}\nTotal Komisi capster: ${rupiah(totalBarber)}\nTotal Bagian seller: ${rupiah(totalSeller)}\nTotal Bagian Eastville: ${rupiah(totalEastville)}`}
        />
      )}
    </div>
  )
}

function ProductDetail() {
  return (
    <section className="panel product-detail">
      <PageTitle eyebrow="Rincian" title="Per produk" />
      {[
        ["Free Style Dust", "46 unit", "Rp 3.220.000"],
        ["Hair Paste Pomade", "38 unit", "Rp 2.660.000"],
        ["Water Based Pomade", "34 unit", "Rp 2.380.000"],
        ["Miracle Treatment", "29 unit", "Rp 2.030.000"],
      ].map((x) => (
        <div key={x[0]}>
          <strong>{x[0]}</strong>
          <span>{x[1]}</span>
          <b>{x[2]}</b>
        </div>
      ))}
    </section>
  )
}
function CompactDetail({
  title,
  icon,
  rows,
}: {
  title: string
  icon: IconName
  rows: string[][]
}) {
  return (
    <section className="panel compact-detail">
      <PageTitle eyebrow="Rincian" title={title} />
      {rows.map((x, i) => (
        <div key={x[0]}>
          <span>
            <Icon name={icon} />
          </span>
          <strong>{x[0]}</strong>
          <small>{x[1]}</small>
          <b>{x[2]}</b>
        </div>
      ))}
    </section>
  )
}

const teamData = [
  ["AS", "Ardi Santoso", "Owner", "Aktif"],
  ["SV", "Seva", "Manajer,Kapster", "Aktif"],
  ["TT", "Tatas", "Kasir,Kapster", "Aktif"],
  ["FS", "Faisal", "Kapster", "Aktif"],
  ["FH", "Fadhil", "Kapster", "Aktif"],
  ["FR", "Ferdi", "Kapster", "Aktif"],
]
const serviceRows = [
  {
    name: "Haircut",
    category: "Potong",
    price: 40000,
    active: true,
  },
  {
    name: "Haircut + Cuci",
    category: "Potong",
    price: 50000,
    active: true,
  },
  {
    name: "Shaving",
    category: "Grooming",
    price: 25000,
    active: true,
  },
  {
    name: "Hair Coloring",
    category: "Coloring",
    price: 120000,
    active: true,
  },
  {
    name: "Treatment",
    category: "Perawatan",
    price: 60000,
    active: true,
  },
  {
    name: "Creambath",
    category: "Perawatan",
    price: 75000,
    active: false,
  },
]

function ServicesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<typeof serviceRows[number] | null>(
    null,
  )
  return (
    <div className="content">
      <PageTitle
        eyebrow="Data master"
        title="Layanan dan harga"
        action={
          <Button
            className="primary-button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Icon name="plus" /> Tambah layanan
          </Button>
        }
      />
      <div className="master-summary">
        <span>
          <Icon name="cashier" />
          <strong>5 layanan aktif</strong>
          <small>1 layanan nonaktif</small>
        </span>
        <div className="info-banner">
          <Icon name="history" />
          Mengubah harga tidak mengubah transaksi lama.
        </div>
      </div>
      <section className="panel service-list">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Cari layanan..." />
          </div>
          <select>
            <option>Semua kategori</option>
            <option>Potong</option>
            <option>Perawatan</option>
          </select>
          <select>
            <option>Semua status</option>
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>
        </div>
        <div className="service-head">
          <span>Layanan</span>
          <span>Kategori</span>
          <span>Harga</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {serviceRows.map((service) => (
          <article
            className={`service-row ${service.active ? "" : "inactive"}`}
            key={service.name}
          >
            <span className="service-name">
              <i>
                <Icon name="cashier" />
              </i>
              <strong>{service.name}</strong>
            </span>
            <span>{service.category}</span>
            <strong>{rupiah(service.price)}</strong>
            <i className={`chip ${service.active ? "lunas" : "manual"}`}>
              {service.active ? "Aktif" : "Nonaktif"}
            </i>
            <Button
              className="secondary-button"
              onClick={() => {
                setEditing(service)
                setFormOpen(true)
              }}
            >
              <Icon name="pencil" /> Ubah
            </Button>
          </article>
        ))}
      </section>
      {formOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal service-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setFormOpen(false)
            }}
          >
            <header>
              <div>
                <p className="eyebrow">Data layanan</p>
                <h2>{editing ? "Ubah layanan" : "Tambah layanan"}</h2>
              </div>
              <Button onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Nama layanan</span>
              <input
                defaultValue={editing?.name ?? ""}
                placeholder="Nama layanan"
              />
            </label>
            <label>
              <span>Kategori</span>
              <select defaultValue={editing?.category ?? "Potong"}>
                <option>Potong</option>
                <option>Grooming</option>
                <option>Coloring</option>
                <option>Perawatan</option>
              </select>
            </label>
            <label>
              <span>Harga</span>
              <div className="input-shell">
                <b>Rp</b>
                <input defaultValue={editing?.price ?? 40000} />
              </div>
            </label>
            <div className="toggle-row">
              <span>
                <strong>Status layanan</strong>
                <small>Layanan aktif muncul pada halaman Kasir.</small>
              </span>
              <i className="toggle on">
                <b />
              </i>
            </div>
            <div className="info-banner">
              <Icon name="history" /> Harga baru hanya berlaku untuk transaksi
              setelahnya.
            </div>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setFormOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan layanan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

const adminProducts = [
  [
    "HP-FSD-01",
    "Free Style Dust",
    "HAIRPRO Official",
    3,
    "Persen 10/60/30",
    "Aktif",
  ],
  [
    "HP-HPP-02",
    "Hair Paste Pomade",
    "HAIRPRO Official",
    8,
    "Nominal tetap",
    "Aktif",
  ],
  [
    "HP-WBP-03",
    "Water Based Pomade",
    "Mitra Grooming",
    5,
    "Persen 10/60/30",
    "Titipan",
  ],
  [
    "HP-MT-04",
    "Miracle Treatment",
    "Mitra Grooming",
    0,
    "Nominal tetap",
    "Nonaktif",
  ],
] as const

function ProductsPage() {
  const [tab, setTab] = useState<"Daftar" | "Riwayat perubahan">("Daftar")
  const [productsList, setProductsList] = useState([
    {
      code: "HP-FSD-01",
      name: "Free Style Dust",
      seller: "HAIRPRO Official",
      stock: 3,
      scheme: "Persentase" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    },
    {
      code: "HP-HPP-02",
      name: "Hair Paste Pomade",
      seller: "HAIRPRO Official",
      stock: 8,
      scheme: "Nominal tetap" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 40000,
      shares: { barber: 14.3, seller: 57.1, eastville: 28.6 },
      nominalShares: { barber: 10000, seller: 40000, eastville: 20000 },
    },
    {
      code: "HP-WBP-03",
      name: "Water Based Pomade",
      seller: "Mitra Grooming",
      stock: 5,
      scheme: "Persentase" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    },
    {
      code: "HP-MT-04",
      name: "Miracle Treatment",
      seller: "Mitra Grooming",
      stock: 0,
      scheme: "Nominal tetap" as "Persentase" | "Nominal tetap",
      status: "Nonaktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 40000,
      shares: { barber: 14.3, seller: 57.1, eastville: 28.6 },
      nominalShares: { barber: 10000, seller: 40000, eastville: 20000 },
    },
  ])
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    seller: "",
    stock: 0,
    scheme: "Persentase" as "Persentase" | "Nominal tetap",
    status: "Aktif" as "Aktif" | "Nonaktif",
    price: 70000,
    costPrice: 42000,
    shares: { barber: 10, seller: 60, eastville: 30 },
    nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
  })
  const [changeReason, setChangeReason] = useState("")
  const [changeLogs, setChangeLogs] = useState([
    {
      time: "29 Okt 10.15",
      product: "Free Style Dust",
      change: "Komisi capster 8% → 10%",
      by: "Ardi Pradana (Owner)",
      reason: "Penyesuaian kesepakatan komisi baru",
    },
    {
      time: "28 Okt 16.40",
      product: "Water Based Pomade",
      change: "Status Non-aktif → Aktif",
      by: "Dian Setiawan (Manajer)",
      reason: "Stok baru diterima dari pemasok",
    },
    {
      time: "27 Okt 09.22",
      product: "Miracle Treatment",
      change: "Bagian Seller Rp 35rb → Rp 40rb",
      by: "Ardi Pradana (Owner)",
      reason: "Penyesuaian harga seller",
    },
  ])

  const shareTotal =
    formData.shares.barber + formData.shares.seller + formData.shares.eastville

  function openCreate() {
    setEditingCode(null)
    setFormData({
      code: `HP-${Date.now().toString().slice(-4)}`,
      name: "",
      seller: "",
      stock: 10,
      scheme: "Persentase",
      status: "Aktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    })
    setChangeReason("")
    setFormOpen(true)
  }

  function openEdit(prod: (typeof productsList)[number]) {
    setEditingCode(prod.code)
    setFormData({ ...prod })
    setChangeReason("")
    setFormOpen(true)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.seller) return
    if (editingCode) {
      setProductsList((list) =>
        list.map((p) => (p.code === editingCode ? { ...formData } : p)),
      )
      if (changeReason) {
        setChangeLogs((logs) => [
          {
            time: "Baru saja",
            product: formData.name,
            change: `Update skema ${formData.scheme} (${formData.status})`,
            by: "Owner / Manajer",
            reason: changeReason,
          },
          ...logs,
        ])
      }
    } else {
      setProductsList((list) => [{ ...formData }, ...list])
      setChangeLogs((logs) => [
        {
          time: "Baru saja",
          product: formData.name,
          change: `Produk baru (${formData.scheme}, ${formData.status})`,
          by: "Owner / Manajer",
          reason: changeReason || "Penambahan produk baru",
        },
        ...logs,
      ])
    }
    setFormOpen(false)
  }

  return (
    <div className="content">
      <PageTitle
        eyebrow="Data master & komisi"
        title="Produk"
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => setStockOpen(true)}
            >
              <Icon name="plus" /> Pembelian stok
            </Button>
            <Button
              className="primary-button"
              onClick={openCreate}
            >
              <Icon name="plus" /> Tambah produk
            </Button>
          </div>
        }
      />
      <div className="segmented page-segment">
        <Button
          className={tab === "Daftar" ? "active" : ""}
          onClick={() => setTab("Daftar")}
        >
          Daftar produk
        </Button>
        <Button
          className={tab === "Riwayat perubahan" ? "active" : ""}
          onClick={() => setTab("Riwayat perubahan")}
        >
          Riwayat perubahan komisi ({changeLogs.length})
        </Button>
      </div>
      {tab === "Daftar" ? (
        <section className="panel product-admin-list">
          <div className="filters">
            <div className="search">
              <Icon name="search" />
              <input placeholder="Cari nama atau kode..." />
            </div>
            <select>
              <option>Semua status</option>
              <option>Aktif</option>
              <option>Non-aktif</option>
            </select>
          </div>
          <div className="product-admin-head">
            <span>Produk</span>
            <span>Seller / Pemasok</span>
            <span>Stok</span>
            <span>Skema komisi</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {productsList.map((product) => (
            <article className="product-admin-row" key={product.code}>
              <span>
                <i>
                  <Icon name="product" />
                </i>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.code}</small>
                </span>
              </span>
              <span>{product.seller}</span>
              <span className={product.stock <= 3 ? "stock-low" : ""}>
                {product.stock} unit
              </span>
              <span className="scheme-tag">
                {product.scheme === "Persentase"
                  ? `Persen (${product.shares.barber}% / ${product.shares.seller}% / ${product.shares.eastville}%)`
                  : `Nominal (C:${rupiah(product.nominalShares.barber)} · S:${rupiah(product.nominalShares.seller)} · E:${rupiah(product.nominalShares.eastville)})`}
              </span>
              <i
                className={`chip ${
                  product.status === "Aktif"
                    ? "lunas"
                    : "batal"
                }`}
              >
                {product.status === "Aktif" ? "Aktif" : "Non-aktif"}
              </i>
              <Button
                className="secondary-button"
                onClick={() => openEdit(product)}
              >
                Ubah
              </Button>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel change-log">
          <div className="change-log-head">
            <span>Waktu</span>
            <span>Produk</span>
            <span>Perubahan</span>
            <span>Oleh</span>
            <span>Alasan</span>
          </div>
          {changeLogs.map((row, idx) => (
            <article key={idx}>
              <span>{row.time}</span>
              <strong>{row.product}</strong>
              <span>{row.change}</span>
              <span>{row.by}</span>
              <small>{row.reason}</small>
            </article>
          ))}
        </section>
      )}
      {formOpen && (
        <div className="modal-overlay">
          <form
            className="product-modal"
            onSubmit={handleSave}
          >
            <header>
              <div>
                <p className="eyebrow">Pengaturan produk</p>
                <h2>{editingCode ? "Edit Data Produk & Komisi" : "Tambah Produk Baru"}</h2>
              </div>
              <Button onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="product-modal-body">
              <div className="form-grid">
                <label>
                  <span>Nama produk</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Free Style Dust"
                  />
                </label>
                <label>
                  <span>Kode produk</span>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: HP-FSD-01"
                  />
                  <small className="valid-text">Kode unik produk</small>
                </label>
                <label>
                  <span>Nama Seller / Pemasok</span>
                  <input
                    required
                    value={formData.seller}
                    onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                    placeholder="Contoh: HAIRPRO Official"
                  />
                </label>
                <label>
                  <span>Harga jual (Rp)</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span>Harga modal (Rp)</span>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  />
                </label>
                <label>
                  <span>Stok produk (unit)</span>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </label>
                <div className="status-toggle-field">
                  <span>Status produk</span>
                  <div className="status-toggle-switch">
                    <button
                      type="button"
                      className={`status-btn ${formData.status === "Aktif" ? "active" : ""}`}
                      onClick={() => setFormData({ ...formData, status: "Aktif" })}
                    >
                      <i className="status-dot green" /> Aktif
                    </button>
                    <button
                      type="button"
                      className={`status-btn ${formData.status === "Nonaktif" ? "inactive" : ""}`}
                      onClick={() => setFormData({ ...formData, status: "Nonaktif" })}
                    >
                      <i className="status-dot gray" /> Non-aktif
                    </button>
                  </div>
                </div>
              </div>

              <div className="scheme-panel">
                <span className="form-label">Skema komisi</span>
                <div className="commission-radio-group">
                  <label className={`commission-radio-card ${formData.scheme === "Persentase" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="commissionScheme"
                      checked={formData.scheme === "Persentase"}
                      onChange={() => setFormData({ ...formData, scheme: "Persentase" })}
                    />
                    <span className="radio-circle" />
                    <div>
                      <strong>Persentase (%)</strong>
                      <small>Bagi hasil proporsional dari omzet penjualan</small>
                    </div>
                  </label>
                  <label className={`commission-radio-card ${formData.scheme === "Nominal tetap" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="commissionScheme"
                      checked={formData.scheme === "Nominal tetap"}
                      onChange={() => setFormData({ ...formData, scheme: "Nominal tetap" })}
                    />
                    <span className="radio-circle" />
                    <div>
                      <strong>Nominal Tetap (Rp)</strong>
                      <small>Nilai tetap (flat fee) per unit produk terjual</small>
                    </div>
                  </label>
                </div>

                {formData.scheme === "Persentase" ? (
                  <>
                    <div className="share-inputs">
                      <label>
                        <span>Bagian Capster (%)</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: { ...formData.shares, barber: Number(e.target.value) },
                              })
                            }
                            type="number"
                            value={formData.shares.barber}
                          />
                          <b>%</b>
                        </div>
                      </label>
                      <label>
                        <span>Bagian Seller / Pemasok (%)</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: { ...formData.shares, seller: Number(e.target.value) },
                              })
                            }
                            type="number"
                            value={formData.shares.seller}
                          />
                          <b>%</b>
                        </div>
                      </label>
                      <label>
                        <span>Bagian Eastville (%)</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: { ...formData.shares, eastville: Number(e.target.value) },
                              })
                            }
                            type="number"
                            value={formData.shares.eastville}
                          />
                          <b>%</b>
                        </div>
                      </label>
                    </div>
                    <div
                      className={`share-bar ${
                        shareTotal === 100 ? "" : "invalid"
                      }`}
                    >
                      <i style={{ width: `${formData.shares.barber}%` }} />
                      <b style={{ width: `${formData.shares.seller}%` }} />
                      <em style={{ width: `${formData.shares.eastville}%` }} />
                    </div>
                    <span
                      className={
                        shareTotal === 100 ? "valid-text" : "error-text"
                      }
                    >
                      {shareTotal === 100
                        ? "Total 100% OK"
                        : `Total ${shareTotal}% · harus 100%`}
                    </span>
                    <div className="commission-preview">
                      Contoh jual 1 unit {rupiah(formData.price)} → Capster: {rupiah(Math.round((formData.price * formData.shares.barber) / 100))} · Seller: {rupiah(Math.round((formData.price * formData.shares.seller) / 100))} · Eastville: {rupiah(Math.round((formData.price * formData.shares.eastville) / 100))}
                    </div>
                  </>
                ) : (
                  <div className="nominal-scheme">
                    <label>
                      <span>Bagian Capster (Rp/unit)</span>
                      <input
                        type="number"
                        value={formData.nominalShares.barber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              barber: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Bagian Seller / Pemasok (Rp/unit)</span>
                      <input
                        type="number"
                        value={formData.nominalShares.seller}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              seller: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Bagian Eastville (Rp/unit)</span>
                      <input
                        type="number"
                        value={formData.nominalShares.eastville}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              eastville: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <div className="nominal-summary-note">
                      Total pembagian: {rupiah(formData.nominalShares.barber + formData.nominalShares.seller + formData.nominalShares.eastville)} (Harga jual: {rupiah(formData.price)})
                    </div>
                    <div className="commission-preview">
                      Contoh jual 1 unit {rupiah(formData.price)} → Capster: {rupiah(formData.nominalShares.barber)} · Seller: {rupiah(formData.nominalShares.seller)} · Eastville: {rupiah(formData.nominalShares.eastville)}
                    </div>
                  </div>
                )}
              </div>
              <label>
                <span>Catatan / Alasan Perubahan Komisi</span>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Tuliskan alasan penyesuaian komisi atau catatan seller untuk jejak log..."
                />
              </label>
            </div>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                Batal
              </Button>
              <Button
                className="primary-button"
                disabled={formData.scheme === "Persentase" && shareTotal !== 100}
                type="submit"
              >
                Simpan produk
              </Button>
            </footer>
          </form>
        </div>
      )}
      {stockOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setStockOpen(false)
            }}
          >
            <header>
              <h2>Catat pembelian stok</h2>
              <Button onClick={() => setStockOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Produk</span>
              <select>
                <option>Free Style Dust</option>
                <option>Hair Paste Pomade</option>
              </select>
            </label>
            <label>
              <span>Jumlah masuk</span>
              <input defaultValue="10" type="number" />
            </label>
            <label>
              <span>Pemasok (opsional)</span>
              <input defaultValue="HAIRPRO Official" />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setStockOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Tambah stok
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

function AttendancePage() {
  const [state, setState] = useState<"ready" | "camera" | "preview" | "done">(
    "ready",
  )
  const [issueOpen, setIssueOpen] = useState(false)
  return (
    <div className="mobile-content attendance-self">
      <PageTitle eyebrow="Rabu, 29 Oktober 2026" title="Absensi Saya" />
      <article className="schedule-today">
        <div>
          <span>Jadwal masuk hari ini</span>
          <strong>10.00</strong>
        </div>
        <i className={`chip ${state === "done" ? "lunas" : "manual"}`}>
          {state === "done" ? "Tepat waktu" : "Belum check-in"}
        </i>
      </article>
      {state === "ready" && (
        <section className="checkin-card">
          <span className="camera-hero-icon">
            <Icon name="camera" />
          </span>
          <h2>Siap untuk check-in?</h2>
          <p>Foto harus diambil langsung dari kamera perangkat.</p>
          <Button
            className="checkin-main-button"
            onClick={() => setState("camera")}
          >
            <Icon name="camera" /> Check-in
          </Button>
          <Button
            className="secondary-button"
            onClick={() => setIssueOpen(true)}
          >
            Lapor kendala
          </Button>
        </section>
      )}
      {state === "camera" && (
        <section className="camera-screen">
          <div className="camera-top">
            <Button onClick={() => setState("ready")}>
              <Icon name="close" />
            </Button>
            <span>Ambil foto check-in</span>
          </div>
          <div className="camera-view">
            <div className="face-frame">
              <Icon name="user" />
            </div>
            <p>Posisikan wajah di dalam bingkai</p>
          </div>
          <Button className="shutter" onClick={() => setState("preview")}>
            <i />
          </Button>
        </section>
      )}
      {state === "preview" && (
        <section className="checkin-card photo-preview">
          <div className="captured-photo">
            <Icon name="user" />
            <span>Pratinjau foto</span>
          </div>
          <div className="preview-actions">
            <Button
              className="secondary-button"
              onClick={() => setState("camera")}
            >
              Ulangi
            </Button>
            <Button className="primary-button" onClick={() => setState("done")}>
              Kirim foto
            </Button>
          </div>
        </section>
      )}
      {state === "done" && (
        <section className="checkin-card checkin-success">
          <span>
            <Icon name="check" />
          </span>
          <p className="eyebrow">Waktu dari server</p>
          <h2>09.54</h2>
          <i className="chip lunas">Tepat waktu</i>
          <p>Check-in berhasil untuk jadwal masuk pukul 10.00.</p>
        </section>
      )}
      <section className="panel attendance-history">
        <PageTitle eyebrow="Riwayat pribadi" title="Absensi terakhir" />
        {[
          ["29 Okt 2026", "09.54", "Tepat waktu"],
          ["28 Okt 2026", "10.12", "Terlambat 12 mnt"],
          ["27 Okt 2026", "09.48", "Tepat waktu"],
        ].map((row) => (
          <article key={row[0]}>
            <span className="photo-thumb">
              <Icon name="user" />
            </span>
            <span>
              <strong>{row[0]}</strong>
              <small>{row[1]} · waktu server</small>
            </span>
            <i
              className={`chip ${
                row[2].startsWith("Terlambat") ? "manual" : "lunas"
              }`}
            >
              {row[2]}
            </i>
          </article>
        ))}
      </section>
      {issueOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setIssueOpen(false)
            }}
          >
            <header>
              <h2>Lapor kendala absensi</h2>
              <Button onClick={() => setIssueOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Jenis kendala</span>
              <select>
                <option>Kamera rusak / tidak dapat dibuka</option>
                <option>HP mati</option>
                <option>Internet bermasalah</option>
              </select>
            </label>
            <label>
              <span>Penjelasan</span>
              <textarea placeholder="Jelaskan kendala yang terjadi..." />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setIssueOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Kirim laporan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

function AttendanceAdminPage({ currentUser }: { currentUser?: AppUser } = {}) {
  const [tab, setTab] = useState<"Jadwal" | "Riwayat" | "Koreksi">("Jadwal")
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const isManager = currentUser?.role === "Manajer"
  return (
    <div className="content">
      <PageTitle
        eyebrow={isManager ? "Manajer" : "Owner"}
        title="Absensi Admin"
      />
      <div className="segmented page-segment">
        {(["Jadwal", "Riwayat", "Koreksi"] as const).map((value) => (
          <Button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      {tab === "Jadwal" && (
        <section className="panel schedule-grid-card">
          <div className="schedule-toolbar">
            <Button className="secondary-button">
              <Icon name="back" />
            </Button>
            <strong>27 Okt – 2 Nov 2026</strong>
            <Button className="secondary-button">
              <Icon name="arrow" />
            </Button>
            <Button className="primary-button">
              <Icon name="plus" /> Atur jadwal
            </Button>
          </div>
          <div className="week-grid">
            <div className="week-head">
              <span>Kapster</span>
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            {[
              [
                "Seva",
                "10.00",
                "10.00",
                "10.00",
                "10.00",
                "Libur",
                "08.00",
                "08.00",
              ],
              [
                "Tatas",
                "08.00",
                "08.00",
                "Libur",
                "08.00",
                "08.00",
                "10.00",
                "10.00",
              ],
              [
                "Faisal",
                "10.00",
                "Libur",
                "10.00",
                "10.00",
                "10.00",
                "08.00",
                "08.00",
              ],
              [
                "Fadhil",
                "08.00",
                "08.00",
                "08.00",
                "Libur",
                "08.00",
                "10.00",
                "10.00",
              ],
              [
                "Ferdi",
                "10.00",
                "10.00",
                "08.00",
                "08.00",
                "Libur",
                "10.00",
                "08.00",
              ],
            ].map((row) => (
              <div className="week-row" key={row[0]}>
                <strong>{row[0]}</strong>
                {row.slice(1).map((time, index) => (
                  <button
                    className={time === "Libur" ? "off" : ""}
                    key={`${row[0]}-${index}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Riwayat" && (
        <section className="panel attendance-admin-list">
          <div className="filters">
            <div className="input-shell">
              <Icon name="calendar" />
              <input defaultValue="2026-10-29" type="date" />
            </div>
            <select>
              <option>Semua kapster</option>
            </select>
            <select>
              <option>Semua status</option>
            </select>
          </div>
          {[
            ["Seva", "10.00", "09.54", "Tepat waktu"],
            ["Tatas", "08.00", "08.07", "Terlambat 7 mnt"],
            ["Faisal", "10.00", "10.12", "Dikoreksi"],
          ].map((row) => (
            <article key={row[0]}>
              <Button
                className="photo-thumb"
                onClick={() => setPhotoOpen(true)}
              >
                <Icon name="user" />
              </Button>
              <span>
                <strong>{row[0]}</strong>
              </span>
              <span>
                <small>Jadwal</small>
                <strong>{row[1]}</strong>
              </span>
              <span>
                <small>Check-in</small>
                <strong>{row[2]}</strong>
              </span>
              <i
                className={`chip ${
                  row[3].startsWith("Terlambat") || row[3] === "Dikoreksi"
                    ? "manual"
                    : "lunas"
                }`}
              >
                {row[3]}
              </i>
            </article>
          ))}
        </section>
      )}
      {tab === "Koreksi" && (
        <section className="correction-grid">
          <article className="panel correction-card">
            <span className="alert-icon">
              <Icon name="camera" />
            </span>
            <div>
              <strong>Faisal</strong>
              <small>29 Okt 2026 · Kamera tidak dapat dibuka</small>
              <p>Sudah mencoba izin kamera tetapi halaman tetap hitam.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() => setCorrectionOpen(true)}
            >
              Koreksi
            </Button>
          </article>
          <article className="panel correction-card">
            <span className="alert-icon">
              <Icon name="alert" />
            </span>
            <div>
              <strong>Fadhil</strong>
              <small>28 Okt 2026 · Internet mati</small>
              <p>Check-in dilaporkan setelah koneksi kembali.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() => setCorrectionOpen(true)}
            >
              Koreksi
            </Button>
          </article>
        </section>
      )}
      {correctionOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setCorrectionOpen(false)
            }}
          >
            <header>
              <h2>Koreksi absensi</h2>
              <Button onClick={() => setCorrectionOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="old-new">
              <span>
                <small>Nilai lama</small>
                <strong>Belum check-in</strong>
              </span>
              <Icon name="arrow" />
              <span>
                <small>Nilai baru</small>
                <strong>Hadir · 10.04</strong>
              </span>
            </div>
            <label>
              <span>Waktu aktual</span>
              <input defaultValue="10:04" type="time" />
            </label>
            <label>
              <span>Status</span>
              <select>
                <option>Tepat waktu</option>
                <option>Terlambat</option>
              </select>
            </label>
            <label>
              <span>Alasan koreksi (wajib)</span>
              <textarea placeholder="Tuliskan dasar koreksi..." />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setCorrectionOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan koreksi
              </Button>
            </footer>
          </form>
        </div>
      )}
      {photoOpen && (
        <div className="modal-overlay photo-modal">
          <section>
            <Button onClick={() => setPhotoOpen(false)}>
              <Icon name="close" />
            </Button>
            <div>
              <Icon name="user" />
            </div>
            <h3>Seva</h3>
            <p>Waktu server 09.54 · Jadwal 10.00</p>
          </section>
        </div>
      )}
    </div>
  )
}

function AuditPage() {
  const logs = [
    [
      "29 Okt 10.42",
      "Ardi Santoso",
      "Ubah komisi",
      "Free Style Dust",
      "8% → 10%",
      "Kesepakatan baru",
    ],
    ["29 Okt 10.24", "Tatas", "Login", "Akun Tatas", "Berhasil", "—"],
    [
      "29 Okt 09.54",
      "Ardi Santoso",
      "Buka foto absensi",
      "Seva",
      "29 Okt 2026",
      "Pemeriksaan harian",
    ],
    [
      "29 Okt 09.12",
      "Tatas",
      "Batalkan transaksi",
      "INV-291026-0082",
      "Rp 110.000",
      "Salah input",
    ],
    [
      "28 Okt 18.40",
      "Seva",
      "Pulihkan transaksi",
      "INV-281026-0077",
      "Rp 70.000",
      "Transaksi valid",
    ],
    [
      "28 Okt 16.20",
      "Ardi Santoso",
      "Bayar gaji",
      "Tatas",
      "Rp 1.700.000",
      "Periode 16–31",
    ],
  ]
  return (
    <div className="content">
      <PageTitle eyebrow="Khusus Owner" title="Jejak audit" />
      <div className="append-only-note">
        <Icon name="lock" />
        <span>
          <strong>Log hanya-tambah</strong>Data tidak dapat diubah atau dihapus.
        </span>
      </div>
      <section className="panel audit-list">
        <div className="filters">
          <div className="input-shell">
            <Icon name="calendar" />
            <input defaultValue="2026-10-29" type="date" />
          </div>
          <select>
            <option>Semua jenis aksi</option>
            <option>Login</option>
            <option>Transaksi</option>
            <option>Gaji</option>
          </select>
          <select>
            <option>Semua pengguna</option>
          </select>
        </div>
        <div className="audit-head">
          <span>Waktu</span>
          <span>Pengguna</span>
          <span>Aksi</span>
          <span>Objek</span>
          <span>Detail</span>
          <span>Alasan</span>
        </div>
        {logs.map((row) => (
          <article className="audit-row" key={row.join("-")}>
            {row.map((value, index) => (
              <span
                className={index === 2 ? "audit-action" : ""}
                key={`${value}-${index}`}
              >
                {value}
              </span>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}

function BackupPage() {
  const [backingUp, setBackingUp] = useState(false)
  const [restore, setRestore] = useState<0 | 1 | 2>(0)
  function startBackup() {
    setBackingUp(true)
    window.setTimeout(() => setBackingUp(false), 1600)
  }
  return (
    <div className="content">
      <PageTitle eyebrow="Keamanan data" title="Backup" />
      <section className="backup-status-grid">
        <article className="backup-hero">
          <span className="backup-icon">
            <Icon name="restore" />
          </span>
          <div>
            <small>Status backup otomatis</small>
            <h2>Aktif · tiap 2 minggu</h2>
            <p>Backup berikutnya dijadwalkan 12 Nov 2026.</p>
          </div>
          <i className="chip lunas">Terjadwal</i>
        </article>
        <article className="panel last-backup">
          <small>Backup terakhir</small>
          <strong>29 Okt 2026 · 02.00</strong>
          <span>
            <Icon name="check" /> Berhasil diverifikasi
          </span>
        </article>
      </section>
      <section className="panel backup-actions-card">
        <div>
          <p className="eyebrow">Backup manual</p>
          <h2>Buat salinan terbaru</h2>
          <p>Simpan salinan seluruh Sheet dan pengaturan aplikasi sekarang.</p>
        </div>
        <Button
          className="primary-button"
          onClick={startBackup}
          disabled={backingUp}
        >
          <Icon name={backingUp ? "clock" : "plus"} />
          {backingUp ? "Membuat backup..." : "Backup sekarang"}
        </Button>
      </section>
      <section className="panel backup-list">
        <PageTitle eyebrow="Arsip tersimpan" title="Daftar backup" />
        <div className="backup-head">
          <span>Nama backup</span>
          <span>Dibuat</span>
          <span>Ukuran</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {[
          ["BarberBoss_2026-10-29", "29 Okt 2026 · 02.00", "4,8 MB"],
          ["BarberBoss_2026-10-15", "15 Okt 2026 · 02.00", "4,5 MB"],
          ["BarberBoss_2026-10-01", "1 Okt 2026 · 02.00", "4,2 MB"],
        ].map((row) => (
          <article className="backup-row" key={row[0]}>
            <span>
              <Icon name="file" />
              <strong>{row[0]}</strong>
            </span>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <i className="chip lunas">Siap</i>
            <Button
              className="restore-danger-button"
              onClick={() => setRestore(1)}
            >
              <Icon name="restore" /> Pulihkan
            </Button>
          </article>
        ))}
      </section>
      {restore > 0 && (
        <div className="modal-overlay">
          <section className="restore-confirm">
            <span className="restore-danger-icon">
              <Icon name="alert" />
            </span>
            <p className="eyebrow">Konfirmasi {restore} dari 2</p>
            <h2>
              {restore === 1 ? "Pulihkan dari backup?" : "Konfirmasi terakhir"}
            </h2>
            <p>
              {restore === 1
                ? "Data saat ini akan diganti dengan isi backup terpilih."
                : "Tindakan ini berisiko dan tidak dapat dibatalkan secara otomatis."}
            </p>
            {restore === 2 && (
              <label>
                <span>Ketik PULIHKAN untuk melanjutkan</span>
                <input placeholder="PULIHKAN" />
              </label>
            )}
            <div>
              <Button
                className="secondary-button"
                onClick={() => setRestore(0)}
              >
                Batal
              </Button>
              <Button
                className="restore-danger-button"
                onClick={() => setRestore(restore === 1 ? 2 : 0)}
              >
                {restore === 1 ? "Lanjutkan" : "Pulihkan sekarang"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TeamPage({ currentUser }: { currentUser?: AppUser } = {}) {
  const [form, setForm] = useState(false)
  const [roles, setRoles] = useState<string[]>(["Kapster"])
  const [commission, setCommission] = useState(40)
  const isManager = currentUser?.role === "Manajer"
  return (
    <div className="content">
      <PageTitle
        eyebrow="Akun dan hak akses"
        title="Tim Eastville"
        action={
          isManager ? (
            <span className="chip active">Mode Lihat (Manajer)</span>
          ) : (
            <Button className="primary-button" onClick={() => setForm(true)}>
              <Icon name="plus" /> Tambah anggota
            </Button>
          )
        }
      />
      {isManager && (
        <div className="danger-banner" style={{ marginBottom: 14 }}>
          <Icon name="lock" /> Sesuai KK-05, penambahan, pengubahan, dan
          penonaktifan anggota tim hanya dapat dilakukan oleh Owner.
        </div>
      )}
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <input placeholder="Cari nama atau username..." />
        </div>
        <select>
          <option>Semua peran</option>
        </select>
      </div>
      <div className="team-grid">
        {teamData.map((x) => (
          <article
            className={`team-card ${x[3] === "Nonaktif" ? "inactive" : ""}`}
            key={x[1]}
          >
            <header>
              <span>{x[0]}</span>
              <i className={x[3] === "Aktif" ? "active" : ""}>{x[3]}</i>
            </header>
            <h3>{x[1]}</h3>
            <small>@{x[1].toLowerCase().replace(" ", ".")}</small>
            <div className="roles">
              {x[2].split(",").map((r) => (
                <i key={r}>{r}</i>
              ))}
            </div>
            <dl>
              {x[2].includes("Kapster") && (
                <div>
                  <Icon name="chart" />
                  <span>Komisi 40%</span>
                </div>
              )}
            </dl>
            <Button className="secondary-button" onClick={() => setForm(true)}>
              <Icon name="pencil" /> Ubah data
            </Button>
          </article>
        ))}
      </div>
      {form && (
        <div className="modal-overlay">
          <form
            className="staff-form"
            onSubmit={(e) => {
              e.preventDefault()
              setForm(false)
            }}
          >
            <header>
              <div>
                <p className="eyebrow">Anggota tim</p>
                <h2>Tambah / ubah data</h2>
              </div>
              <Button onClick={() => setForm(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="staff-form-body">
              <div className="form-grid">
                <label>
                  <span>Nama lengkap</span>
                  <input defaultValue="Seva" />
                </label>
                <label>
                  <span>Username</span>
                  <input defaultValue="seva" />
                </label>
                <label>
                  <span>Email reset PIN</span>
                  <input defaultValue="seva@eastville.id" />
                </label>
                <label>
                  <span>PIN awal 6 digit</span>
                  <input placeholder="••••••" type="password" />
                </label>
              </div>
              <span className="form-label">Peran (bisa lebih dari satu)</span>
              <div className="role-options">
                {["Owner", "Manajer", "Kasir", "Kapster"].map((r) => (
                  <Button
                    className={roles.includes(r) ? "active" : ""}
                    key={r}
                    onClick={() =>
                      setRoles((v) =>
                        v.includes(r) ? v.filter((x) => x !== r) : [...v, r],
                      )
                    }
                  >
                    <i>{roles.includes(r) && <Icon name="check" />}</i>
                    {r}
                  </Button>
                ))}
              </div>
              {roles.includes("Kapster") && (
                <>
                  <label>
                    <span>Komisi pribadi</span>
                    <div className="input-shell">
                      <input
                        onChange={(e) => setCommission(Number(e.target.value))}
                        type="number"
                        value={commission}
                      />
                      <b>%</b>
                    </div>
                  </label>
                  <div className="info-banner">
                    <Icon name="alert" /> Berlaku untuk transaksi setelahnya.
                  </div>
                  <label>
                    <span>Alasan perubahan komisi</span>
                    <textarea placeholder="Wajib jika komisi berubah..." />
                  </label>
                </>
              )}
              <div className="toggle-row">
                <span>
                  <strong>Status akun</strong>
                  <small>Pengguna dapat masuk ke sistem</small>
                </span>
                <i className="toggle on">
                  <b />
                </i>
              </div>
            </div>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setForm(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan perubahan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<AppUser>(DEMO_USERS.Owner)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [page, setPage] = useState<Page>("dashboard")
  const [mobileNav, setMobileNav] = useState(false)

  if (!loggedIn) {
    return (
      <Login
        onLogin={(user, targetPage) => {
          setCurrentUser(user)
          setLoggedIn(true)
          if (targetPage) {
            setPage(targetPage)
          } else if (user.role === "Kasir") {
            setPage("cashier")
          } else if (user.role === "Manajer") {
            setPage("services")
          } else {
            setPage("dashboard")
          }
        }}
      />
    )
  }

  const screen =
    page === "dashboard" ? (
      currentUser.role === "Kapster" ? (
        <KapsterDashboard navigate={setPage} user={currentUser} />
      ) : currentUser.role === "Manajer" ? (
        <ManagerDashboard navigate={setPage} user={currentUser} />
      ) : (
        <Dashboard navigate={setPage} />
      )
    ) : page === "cashier" ? (
      currentUser.role === "Kasir" ? (
        <Cashier currentUser={currentUser} onNavigate={setPage} />
      ) : (
        <div className="content">
          <div className="role-denied-box">
            <Icon name="lock" />
            <h3>Akses Dibatasi: Khusus Kasir</h3>
            <p>
              Halaman Kasir (POS input transaksi) hanya dapat diakses oleh peran{" "}
              <strong>Kasir</strong>. Peran Anda saat ini adalah{" "}
              <strong>{currentUser.role}</strong>.
            </p>
            <Button
              className="primary-button"
              onClick={() => setPage("dashboard")}
            >
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      )
    ) : page === "history" ? (
      <HistoryPage currentUser={currentUser} />
    ) : page === "manual" ? (
      <ManualPage />
    ) : page === "expenses" ? (
      <ExpensesPage />
    ) : page === "payroll" ? (
      <PayrollPage />
    ) : page === "my-salary" ? (
      <MySalary />
    ) : page === "reports" ? (
      <ReportsPage currentUser={currentUser} />
    ) : page === "product-reports" ? (
      <ProductReports currentUser={currentUser} />
    ) : page === "services" ? (
      <ServicesPage />
    ) : page === "products" ? (
      <ProductsPage />
    ) : page === "attendance" ? (
      <AttendancePage />
    ) : page === "attendance-admin" ? (
      <AttendanceAdminPage currentUser={currentUser} />
    ) : page === "audit" ? (
      <AuditPage />
    ) : page === "backup" ? (
      <BackupPage />
    ) : (
      <TeamPage currentUser={currentUser} />
    )
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
        <Sidebar
          active={page}
          currentUser={currentUser}
          expanded={sidebarExpanded}
          onLogout={() => setLoggedIn(false)}
          onNavigate={(next) => {
            setPage(next)
            setMobileNav(false)
          }}
          onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
        />
      </div>
      <main className="workspace">
        <AppHeader onMenu={() => setMobileNav(true)} />
        {screen}
      </main>
    </div>
  )
}

export default App
