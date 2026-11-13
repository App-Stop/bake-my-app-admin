import { useState } from 'react'
import AuthLayout from './AuthLayout'
import { Alert, Button, PasswordField, TextField } from '../FormParts'
import { signIn } from '../../services/adminAuth'
import { useSubmit } from '../../services/hooks'
import { adminLinkClick, adminPaths, queryParam } from '../../navigation'

const NOTICES = {
  reset: 'Your password has been changed. Sign in with the new one.',
  expired: 'Your session has ended. Sign in again to continue.',
}

const SignIn = ({ reason, onSignedIn }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loading, error, fields, run, clearField } = useSubmit(['email', 'password'])
  const notice = NOTICES[queryParam('notice')] ?? NOTICES[reason]

  const submit = async (event) => {
    event.preventDefault()
    const { ok } = await run(() => signIn(email.trim(), password))
    if (ok) onSignedIn?.()
  }

  return (
    <AuthLayout
      title="Welcome back"
      hint="Sign in to the Bake My App admin panel."
      onSubmit={submit}
    >
      {notice && !error && <Alert tone="info">{notice}</Alert>}

      <div className="admin-fields">
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearField('email') }}
          error={fields.email}
          required
          autoFocus
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearField('password') }}
          error={fields.password}
          required
        />
        <a
          href={adminPaths.forgotPassword}
          className="admin-link admin-link--end"
          onClick={adminLinkClick(adminPaths.forgotPassword)}
        >
          Forgot password?
        </a>
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" loading={loading} className="w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </AuthLayout>
  )
}

export default SignIn
