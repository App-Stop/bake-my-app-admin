import { Lock, TrendingDown, TrendingUp } from 'lucide-react'

export const AdminHeader = ({ title, subtitle, tag, actions }) => (
  <header className="admin-header">
    <div className="admin-header-text">
      <div className="admin-header-title-row">
        <h1 className="admin-title">{title}</h1>
        {tag && <span className="admin-tag">{tag}</span>}
      </div>
      {subtitle && <p className="admin-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="admin-header-actions">{actions}</div>}
  </header>
)

// White panel with an optional heading row; the base block for forms and lists.
export const Panel = ({ title, hint, action, children, className = '' }) => (
  <section className={`admin-card ${className}`}>
    {(title || action) && (
      <div className="admin-card-head">
        <div className="min-w-0">
          {title && <h2 className="admin-card-title">{title}</h2>}
          {hint && <p className="admin-card-hint">{hint}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="admin-card-body">{children}</div>
  </section>
)

export const NoAccess = () => (
  <div className="admin-empty">
    <span className="admin-empty-icon"><Lock strokeWidth={1.5} /></span>
    <h2 className="admin-card-title">You do not have access to this</h2>
    <p className="admin-subtitle">Ask a super admin if you need this screen.</p>
  </div>
)

export const StatCard = ({ icon: Icon, label, value, change, highlight = false }) => {
  const up = change >= 0
  const Trend = up ? TrendingUp : TrendingDown
  return (
    <article className={`admin-stat ${highlight ? 'admin-stat--primary' : ''}`}>
      <div className="admin-stat-top">
        <p className="admin-stat-label">{label}</p>
        <span className="admin-stat-icon"><Icon strokeWidth={1.5} /></span>
      </div>
      <p className="admin-stat-value">{value}</p>
      <p className={`admin-trend ${up ? 'admin-trend--up' : 'admin-trend--down'}`}>
        <Trend strokeWidth={2} />
        {up ? '+' : ''}{change}% <span>vs last month</span>
      </p>
    </article>
  )
}

export const StatusPill = ({ status }) => (
  <span className={`admin-status admin-status--${status.toLowerCase()}`}>{status}</span>
)

// `columns`: [{ key, label, render?, align? }] — `render` receives the row.
export const AdminTable = ({ title, action, columns, rows, empty = 'Nothing to show yet.' }) => (
  <section className="admin-card">
    {(title || action) && (
      <div className="admin-card-head">
        {title && <h2 className="admin-card-title">{title}</h2>}
        {action}
      </div>
    )}
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'text-right' : ''}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="admin-table-empty">{empty}</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)

export const NameCell = ({ name, sub }) => (
  <div className="admin-name-cell">
    <span className="admin-avatar admin-avatar--sm" aria-hidden="true">{name[0]}</span>
    <div className="min-w-0">
      <p className="admin-cell-strong">{name}</p>
      {sub && <p className="admin-cell-sub">{sub}</p>}
    </div>
  </div>
)
