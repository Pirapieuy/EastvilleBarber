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
  userName?: string
  children?: ReactNode
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
        <Button
          className="mobile-menu mobile-fab"
          onClick={() => setMobileNav(true)}
          aria-label="Buka menu navigasi"
          title="Buka Menu"
        >
          <Icon name="menu" />
        </Button>
        {children}
      </main>
    </div>
  )
}

export default AppLayout
