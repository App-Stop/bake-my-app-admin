import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { Alert, Button, PasswordField, PasswordRules } from '../FormParts'
import { resetPassword } from '../../services/adminAuth'
import { useSubmit } from '../../services/hooks'
import { adminLinkClick, adminPaths, navigateAdmin, queryParam } from '../../navigation'

const ResetPassword = () => {
  const [token] = useState(() => queryParam('token'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const { loading, error, status, fields, run, clearField } = useSubmit(['password'])
  const linkBroken = !token || status === 400

  const submit = async (event) => {
    event.preventDefault()
    if (password !== confirm) return setMismatch(true)
    const { ok } = await run(() => resetPassword(token, password))
    if (ok) navigateAdmin(`${adminPaths.login}?notice=reset`, { replace: true })
  }

  const askAgain = (
    <a href={adminPaths.forgotPassword} className="admin-link" onClick={adminLinkClick(adminPaths.forgotPassword)}>
      Ask for a new link
    </a>
  )

  const back = (
    <a href={adminPaths.login} className="admin-link" onClick={adminLinkClick(adminPaths.login)}>
      <ArrowLeft strokeWidth={2} /> Back to sign in
    </a>
  )

  if (linkBroken) {
    return (
      <AuthLayout title="Link expired" footer={back}>
        <Alert action={askAgain}>This link is invalid or has expired.</Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      hint="You'll be signed out on every device and can sign in with the new password."
      onSubmit={submit}
      footer={back}
    >
      <div className="admin-fields">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearField('password') }}
          error={fields.password}
          required
          autoFocus
        />
        <PasswordRules password={password} />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setMismatch(false) }}
          error={mismatch ? 'The passwords do not match.' : undefined}
          required
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" loading={loading} className="w-full">
        {loading ? 'Saving…' : 'Save new password'}
      </Button>
    </AuthLayout>
  )
}

export default ResetPassword
