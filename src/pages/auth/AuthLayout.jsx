import { Lock } from 'lucide-react'
import Logo from '../Logo'

// Shared frame for every screen used without a session.
const AuthLayout = ({ title, hint, children, footer, onSubmit }) => (
  <main className="admin-auth">
    <div className="admin-auth-inner">
      <div className="admin-auth-head">
        <Logo />
        <span className="admin-badge">
          <Lock strokeWidth={2} />
          Admin
        </span>
      </div>

      <form className="admin-auth-card" onSubmit={onSubmit}>
        <div className="admin-auth-heading">
          <h1 className="admin-auth-title">{title}</h1>
          {hint && <p className="admin-auth-hint">{hint}</p>}
        </div>
        {children}
      </form>

      {footer && <div className="admin-auth-footer">{footer}</div>}
    </div>
  </main>
)

export default AuthLayout
