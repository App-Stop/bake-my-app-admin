import { useEffect, useState } from 'react'
import { AdminHeader, Panel } from './AdminParts'
import { Alert, Button, PasswordField, PasswordRules, TextField } from './FormParts'
import { changePassword, fetchProfile, renameMe } from '../services/adminAuth'
import { useSession, useSubmit } from '../services/hooks'
import { roleLabel } from '../permissions'

const ProfileForm = ({ staff }) => {
  const [name, setName] = useState(staff.name ?? '')
  const [saved, setSaved] = useState(false)
  const { loading, error, fields, run, clearField } = useSubmit(['name'])
  const changed = name.trim() && name.trim() !== staff.name

  const submit = async (event) => {
    event.preventDefault()
    setSaved(false)
    const { ok } = await run(() => renameMe(name.trim()))
    if (ok) setSaved(true)
  }

  return (
    <Panel title="Profile" hint="How you appear to the rest of the team.">
      <form className="admin-form" onSubmit={submit}>
        <TextField
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); clearField('name') }}
          error={fields.name}
          required
        />
        <TextField label="Email" type="email" value={staff.email ?? ''} readOnly disabled hint="Your sign-in email." />
        {error && <Alert>{error}</Alert>}
        {saved && <Alert tone="success">Your name has been updated.</Alert>}
        <div className="admin-form-actions">
          <Button type="submit" loading={loading} disabled={!changed}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

const PasswordForm = ({ email }) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [done, setDone] = useState(false)
  const { loading, error, fields, run, clearField } = useSubmit(['currentPassword', 'newPassword'])

  const submit = async (event) => {
    event.preventDefault()
    setDone(false)
    if (next !== confirm) return setMismatch(true)
    const { ok } = await run(() => changePassword(current, next))
    if (ok) {
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
    }
  }

  return (
    <Panel title="Password" hint="Changing it signs you out on every other device.">
      <form className="admin-form" onSubmit={submit}>
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); clearField('currentPassword') }}
          error={fields.currentPassword}
          required
        />
        <div className="admin-form-row">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => { setNext(e.target.value); setDone(false); clearField('newPassword') }}
            error={fields.newPassword}
            required
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setMismatch(false) }}
            error={mismatch ? 'The passwords do not match.' : undefined}
            required
          />
        </div>
        <PasswordRules password={next} email={email} />
        {error && <Alert>{error}</Alert>}
        {done && <Alert tone="success">Password changed. Other devices have been signed out.</Alert>}
        <div className="admin-form-actions">
          <Button type="submit" loading={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

const Account = () => {
  const { staff } = useSession()

  // The session's copy comes from sign-in; refresh it in the background.
  useEffect(() => {
    fetchProfile().catch(() => {})
  }, [])

  return (
    <div className="admin-page admin-page--narrow">
      <AdminHeader title="My account" subtitle="Your details and sign-in settings." />

      <div className="admin-summary">
        <span className="admin-avatar admin-avatar--lg" aria-hidden="true">{staff.name?.[0] ?? '?'}</span>
        <div className="min-w-0">
          <p className="admin-summary-name">{staff.name}</p>
          <p className="admin-cell-sub">{staff.email}</p>
        </div>
        <span className="admin-role">{roleLabel(staff.role)}</span>
      </div>

      <ProfileForm key={staff.name} staff={staff} />
      <PasswordForm email={staff.email} />
    </div>
  )
}

export default Account
