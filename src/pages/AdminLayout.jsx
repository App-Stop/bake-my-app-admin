import { useState } from 'react'
import {
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Mail,
  Store,
  Tags,
  Users,
} from 'lucide-react'
import Logo from './Logo'
import { adminLinkClick, adminPaths } from '../navigation'
import { pageAllowed, roleLabel } from '../permissions'

// `permission` hides the item for roles that can't use it (the server still checks).
const NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'leads', label: 'Leads', icon: ClipboardList },
  { page: 'subscriptions', label: 'Subscriptions', icon: Store },
  { page: 'plans', label: 'Plans', icon: Tags },
  { page: 'staff', label: 'Staff', icon: Users, permission: 'staff:manage' },
  { page: 'auditLogs', label: 'Audit log', icon: FileClock },
  { page: 'emailLogs', label: 'Email log', icon: Mail },
]

const AdminLayout = ({ page, staff, onLogout, children }) => {
  const [signingOut, setSigningOut] = useState(false)
  const name = staff.name || staff.email || 'Staff'

  const logout = async () => {
    setSigningOut(true)
    await onLogout()
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a
          href={adminPaths.dashboard}
          className="admin-brand"
          onClick={adminLinkClick(adminPaths.dashboard)}
        >
          <Logo className="admin-logo--sidebar" />
        </a>

        <nav className="admin-nav" aria-label="Main">
          {NAV.filter((item) => pageAllowed(staff, item.page)).map(
            ({ page: id, label, icon: Icon }) => (
              <a
                key={id}
                href={adminPaths[id]}
                className="admin-nav-link"
                aria-current={
                  (page === 'bakeries' ? 'subscriptions' : page) === id
                    ? 'page'
                    : undefined
                }
                onClick={adminLinkClick(adminPaths[id])}
              >
                <Icon strokeWidth={1.5} />
                {label}
              </a>
            ),
          )}
        </nav>

        <div className="admin-account">
          <a
            href={adminPaths.account}
            className="admin-account-link"
            onClick={adminLinkClick(adminPaths.account)}
            aria-label={`My account: ${name}`}
          >
            <span className="admin-avatar" aria-hidden="true">
              {name[0]}
            </span>
            <span className="admin-account-text">
              <span className="admin-account-name">{name}</span>
              <span className="admin-account-email">
                {staff.roleName || roleLabel(staff.role)}
              </span>
            </span>
          </a>
          <button
            type="button"
            className="admin-icon-btn"
            onClick={logout}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  )
}

export default AdminLayout
