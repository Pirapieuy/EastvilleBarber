import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, BrandMark } from "../../components/common/UI"
import { IconName, Role } from "../../types"

export interface SidebarNavItem {
  page: string
  label: string
  icon: IconName
  alias?: string
}

export interface SidebarNavGroup {
  id: string
  title: string
  items: SidebarNavItem[]
}

export interface SidebarUser {
  name: string
  role: Role
  roleBadge: string
}

export interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
  expanded?: boolean
  onToggleExpanded?: () => void
  onLogout?: () => void
}

interface BaseSidebarProps extends SidebarProps {
  user: SidebarUser
  groups: SidebarNavGroup[]
}

export function BaseSidebar({
  activePage,
  onNavigate,
  expanded = true,
  onToggleExpanded,
  onLogout,
  user,
  groups,
}: BaseSidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  function isItemActive(item: SidebarNavItem) {
    if (activePage === item.page) return true
    if (item.alias && activePage === item.alias) return true
    return false
  }

  return (
    <>
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
        <nav className="sidebar-nav-scroll">
          {groups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id] ?? false
            return (
              <div className="nav-group" key={group.id}>
                {expanded ? (
                  <button
                    type="button"
                    className="nav-group-header"
                    onClick={() => toggleGroup(group.id)}
                    title={`Klik untuk ${isGroupCollapsed ? "buka" : "tutup"} kategori ${group.title}`}
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span className="nav-group-title">{group.title}</span>
                    <span
                      className={`nav-group-chevron ${
                        isGroupCollapsed ? "collapsed" : "expanded"
                      }`}
                    >
                      <Icon name="chevron" />
                    </span>
                  </button>
                ) : (
                  <div className="nav-group-divider" title={group.title} />
                )}
                {!isGroupCollapsed && (
                  <div
                    className={`nav-group-items ${
                      expanded ? "nested-indent" : ""
                    }`}
                  >
                    {group.items.map((item) => (
                      <Button
                        className={`nav-item ${isItemActive(item) ? "active" : ""}`}
                        key={item.page}
                        onClick={() => onNavigate(item.page)}
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          {expanded ? (
            <div className="sidebar-footer-nav">
              <div className="sidebar-account-row">
                <div className="sidebar-user-card">
                  <div className="user-avatar-circle">
                    {user.name.charAt(0)}
                  </div>
                  <div className="user-info-text">
                    <strong>{user.name}</strong>
                    <span
                      className={`role-chip role-${user.role.toLowerCase()}`}
                    >
                      {user.roleBadge}
                    </span>
                  </div>
                </div>
                <Button
                  className="logout-button"
                  onClick={() => setLogoutModalOpen(true)}
                  title="Keluar"
                >
                  <Icon name="logout" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="sidebar-footer-nav">
              <Button
                className="nav-item sidebar-user-pill"
                onClick={() => setLogoutModalOpen(true)}
                title={`${user.name} (${user.roleBadge}) · Keluar`}
              >
                <Icon name="logout" />
                <span className="sidebar-tooltip">
                  Keluar ({user.name})
                </span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {logoutModalOpen && (
        <div className="modal-overlay logout-modal-overlay">
          <div className="logout-confirm-card" role="dialog" aria-modal="true">
            <div className="logout-card-header">
              <div className="logout-icon-shell">
                <Icon name="logout" />
              </div>
              <div>
                <h3>Konfirmasi Keluar</h3>
                <p>Yakin ingin keluar dari akun ini?</p>
              </div>
            </div>
            <div className="logout-card-actions">
              <Button
                className="secondary-button"
                onClick={() => setLogoutModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                className="danger-button"
                onClick={() => {
                  setLogoutModalOpen(false)
                  if (onLogout) onLogout()
                }}
              >
                Ya, Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
