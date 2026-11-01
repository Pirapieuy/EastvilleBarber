import { ReactNode, useState } from "react"
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
  children?: ReactNode
}

const ROLES: Role[] = ["Owner", "Manajer", "Kasir", "Kapster"]

export function AppLayout({
  currentRole,
  activePage,
  onNavigate,
  onRoleChange,
  onLogout,
  children,
}: AppLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)

  const roleKey = toRoleKey(currentRole)

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
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "manajer" && (
          <SidebarManajer
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "owner" && (
          <SidebarOwner
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
        {roleKey === "kapster" && (
          <SidebarKapster
            activePage={activePage}
            expanded={sidebarExpanded}
            onLogout={onLogout}
            onNavigate={handleNavigate}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        )}
      </div>

      <main className="workspace">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="header-left">
              <Button
                className="mobile-menu"
                onClick={() => setMobileNav(true)}
                aria-label="Buka menu navigasi"
                title="Buka Menu"
              >
                <Icon name="menu" />
              </Button>
              <div className="header-status-badge">
                <span className="status-indicator-dot" />
                <span className="status-badge-label">Mode Aktif:</span>
                <strong className={`status-badge-role role-${roleKey}`}>
                  {currentRole}
                </strong>
              </div>
            </div>

            {onRoleChange && (
              <div className="header-role-controls">
                <div
                  className="segmented header-segmented-desktop"
                  title="Ubah peran untuk pengetesan"
                >
                  {ROLES.map((role) => (
                    <Button
                      className={toRoleKey(role) === roleKey ? "active" : ""}
                      key={role}
                      onClick={() => onRoleChange(role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>

                <div className="header-role-mobile">
                  <div className="header-select-shell">
                    <select
                      className="header-role-select"
                      value={typeof currentRole === "string" ? currentRole : ""}
                      onChange={(e) => onRoleChange(e.target.value as Role)}
                      aria-label="Ubah peran aktif"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}

export default AppLayout
