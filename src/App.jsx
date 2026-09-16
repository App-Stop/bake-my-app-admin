import { useEffect, useState } from 'react'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Bakeries from './pages/Bakeries'
import { adminLogout, getAdminSession } from './services/adminAuth'
import { currentAdminPage } from './navigation'
import './pages/admin.css'

const App = () => {
  const [session, setSession] = useState(getAdminSession)
  const [page, setPage] = useState(currentAdminPage)

  useEffect(() => {
    const handleChange = () => {
      setPage(currentAdminPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', handleChange)
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  if (!session) return <AdminLogin onLogin={setSession} />

  const logout = () => {
    adminLogout()
    setSession(null)
  }

  return (
    <AdminLayout page={page} session={session} onLogout={logout}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'bakeries' && <Bakeries />}
    </AdminLayout>
  )
}

export default App
