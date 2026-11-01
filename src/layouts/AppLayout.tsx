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
        <header className="app-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button className="mobile-menu" onClick={() => setMobileNav(true)}>
              <Icon name="menu" />
            </Button>
            <span className="eyebrow" style={{ margin: 0 }}>
              Mode Aktif: <strong>{currentRole.toUpperCase()}</strong>
            </span>
          </div>

          {onRoleChange && (
            <div className="segmented" style={{ transform: "scale(0.9)", transformOrigin: "right center" }} title="Ubah peran untuk pengetesan">
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
          )}
        </header>

        {children}
      </main>
    </div>
  )
}

export default AppLayout
