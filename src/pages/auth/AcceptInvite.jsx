import { useState } from 'react'
import AuthLayout from './AuthLayout'
import { Alert, Button, PasswordField, PasswordRules, TextField } from '../FormParts'
import { acceptInvite } from '../../services/adminAuth'
import { useSubmit } from '../../services/hooks'
import { adminPaths, navigateAdmin, queryParam } from '../../navigation'

const EXPIRED = 'This invitation is invalid or has expired. Ask your administrator to send a new one.'

const AcceptInvite = () => {
  const [token] = useState(() => queryParam('token'))
  const [name, setName] = useState(() => queryParam('name'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const { loading, error, status, fields, run, clearField } = useSubmit(['name', 'password'])

  const submit = async (event) => {
    event.preventDefault()
    if (password !== confirm) return setMismatch(true)
    const { ok } = await run(() => acceptInvite(token, name.trim(), password))
    // 201 signs the person in, so go straight to the home screen.
    if (ok) navigateAdmin(adminPaths.dashboard, { replace: true })
  }

  if (!token || status === 400) {
    return (
      <AuthLayout title="Invitation expired">
        <Alert>{EXPIRED}</Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Join the admin panel"
      hint="You've been invited to Bake My App. Set your name and a password to get started."
      onSubmit={submit}
    >
      <div className="admin-fields">
        <TextField
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); clearField('name') }}
          error={fields.name}
          required
          autoFocus={!name}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearField('password') }}
          error={fields.password}
          required
          autoFocus={Boolean(name)}
        />
        <PasswordRules password={password} />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setMismatch(false) }}
          error={mismatch ? 'The passwords do not match.' : undefined}
          required
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" loading={loading} className="w-full">
        {loading ? 'Creating your account…' : 'Create account'}
      </Button>
    </AuthLayout>
  )
}

export default AcceptInvite
