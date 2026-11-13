import { useEffect, useState } from 'react'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Bakeries from './pages/Bakeries'
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
import './pages/admin.css'

const PAGES = { dashboard: Dashboard, bakeries: Bakeries, staff: Staff, account: Account }

const App = () => {
  const session = useSession()
  const [page, setPage] = useState(currentAdminPage)

  useEffect(() => {
    const handleChange = () => {
      setPage(currentAdminPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', handleChange)
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  // A reload keeps the person signed in through the refresh cookie alone.
  // Concurrent calls (StrictMode runs this twice) share one refresh request.
  useEffect(() => {
    restoreSession()
  }, [])

  const signedIn = session.status === 'signedIn'

  // Signed-in people have no business on the sign-in screen.
  useEffect(() => {
    if (signedIn && page === 'login') navigateAdmin(adminPaths.dashboard, { replace: true })
  }, [signedIn, page])

  // Emailed links work whatever the session state.
  if (page === 'forgotPassword') return <ForgotPassword />
  if (page === 'resetPassword') return <ResetPassword />
  if (page === 'acceptInvite') return <AcceptInvite />

  if (session.status === 'loading') {
    return (
      <main className="admin-boot">
        <Spinner label="Checking your session" />
      </main>
    )
  }

  // Any protected path shows sign-in in place, so the person lands where they
  // were headed once signed in.
  if (!signedIn) {
    return (
      <SignIn
        reason={session.reason}
        onSignedIn={() => page === 'login' && navigateAdmin(adminPaths.dashboard, { replace: true })}
      />
    )
  }

  const Page = PAGES[page] ?? Dashboard

  return (
    <AdminLayout page={page} staff={session.staff ?? {}} onLogout={signOut}>
      <Page />
    </AdminLayout>
  )
}

export default App
