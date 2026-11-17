import { useEffect } from 'react'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Subscriptions from './pages/Subscriptions'
import Plans from './pages/Plans'
import { AuditLogs, EmailLogs } from './pages/Logs'
import { NoAccess } from './pages/AdminParts'
import { useLocation } from './services/useLocation'
import Account from './pages/Account'
import Staff from './pages/Staff'
import SignIn from './pages/auth/SignIn'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AcceptInvite from './pages/auth/AcceptInvite'
import { Spinner } from './pages/FormParts'
import { restoreSession, signOut } from './services/adminAuth'
import { useSession } from './services/hooks'
import { adminPaths, currentAdminPage, navigateAdmin } from './navigation'
import { firstPage, pageAllowed } from './permissions'
import './pages/admin.css'

const PAGES = {
  dashboard: Dashboard,
  bakeries: Subscriptions,
  subscriptions: Subscriptions,
  leads: Leads,
  plans: Plans,
  auditLogs: AuditLogs,
  emailLogs: EmailLogs,
  staff: Staff,
  account: Account,
}

const App = () => {
  const session = useSession()
  const location = useLocation()
  const page = currentAdminPage()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])

  // A reload keeps the person signed in through the refresh cookie alone.
  // Concurrent calls (StrictMode runs this twice) share one refresh request.
  useEffect(() => {
    restoreSession()
  }, [])

  const signedIn = session.status === 'signedIn'

  // Signed-in people have no business on the sign-in screen.
  useEffect(() => {
    if (
      signedIn &&
      (page === 'login' ||
        (page === 'dashboard' && !pageAllowed(session.staff, page)))
    ) {
      navigateAdmin(adminPaths[firstPage(session.staff)], { replace: true })
    }
  }, [signedIn, page, session.staff])

  // Emailed links work whatever the session state.
  if (page === 'forgotPassword') return <ForgotPassword />
  if (page === 'resetPassword') return <ResetPassword />
  if (page === 'acceptInvite') return <AcceptInvite />

  if (session.status === 'loading' || (signedIn && page === 'login')) {
    return (
      <main className="admin-boot">
        <Spinner label="Checking your session" />
      </main>
    )
  }

  // Any protected path shows sign-in in place, so the person lands where they
  // were headed once signed in.
  if (!signedIn) {
    return <SignIn reason={session.reason} />
  }

  const Page = PAGES[page] ?? Dashboard

  return (
    <AdminLayout page={page} staff={session.staff ?? {}} onLogout={signOut}>
      {pageAllowed(session.staff, page) ? (
        <Page key={window.location.pathname} />
      ) : (
        <NoAccess />
      )}
    </AdminLayout>
  )
}

export default App
