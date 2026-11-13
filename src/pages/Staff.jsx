import { useState } from 'react'
import { Send } from 'lucide-react'
import { AdminHeader, NoAccess, Panel } from './AdminParts'
import { Alert, Button, SelectField, TextField } from './FormParts'
import { inviteStaff } from '../services/adminAuth'
import { useSession, useSubmit } from '../services/hooks'
import { ROLES, can, roleLabel } from '../permissions'

const EMPTY = { name: '', email: '', role: 'sales' }

const InviteForm = ({ onSent }) => {
  const [form, setForm] = useState(EMPTY)
  const [sentTo, setSentTo] = useState('')
  const { loading, error, status, fields, run, clearField } = useSubmit(['name', 'email', 'role'])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setSentTo('')
    clearField(key)
  }

  const submit = async (event) => {
    event.preventDefault()
    const invite = { ...form, name: form.name.trim(), email: form.email.trim() }
    const { ok } = await run(() => inviteStaff(invite))
    if (ok) {
      setSentTo(invite.email)
      onSent(invite)
      setForm(EMPTY)
    }
  }

  return (
    <Panel title="Invite someone" hint="They'll get an email with a one-time link, valid for 48 hours.">
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form-row">
          <TextField
            label="Full name"
            placeholder="Priya Shah"
            autoComplete="off"
            value={form.name}
            onChange={set('name')}
            error={fields.name}
            required
          />
          <TextField
            label="Work email"
            type="email"
            placeholder="priya@company.com"
            autoComplete="off"
            value={form.email}
            onChange={set('email')}
            error={fields.email}
            required
          />
        </div>
        <SelectField label="Role" value={form.role} onChange={set('role')} error={fields.role}>
          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </SelectField>

        {error && (
          <Alert>
            {error}
            {status === 503 && ' Check the address and send it again.'}
          </Alert>
        )}
        {sentTo && <Alert tone="success">Invitation sent to {sentTo}.</Alert>}

        <div className="admin-form-actions">
          <Button type="submit" loading={loading}>
            {!loading && <Send strokeWidth={2} />}
            {loading ? 'Sending…' : status === 503 ? 'Try again' : 'Send invitation'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

const Staff = () => {
  const { staff } = useSession()
  // No list endpoint yet: keep what was sent from this tab for reference.
  const [sent, setSent] = useState([])

  if (!can(staff, 'staff:manage')) return <div className="admin-page"><NoAccess /></div>

  const addSent = (invite) =>
    setSent((list) => [{ ...invite, at: new Date() }, ...list.filter((i) => i.email !== invite.email)])

  return (
    <div className="admin-page">
      <AdminHeader title="Staff" subtitle="Invite people to the admin panel and choose what they can do." />

      <div className="admin-split">
        <div className="admin-stack">
          <InviteForm onSent={addSent} />

          {sent.length > 0 && (
            <Panel title="Sent from this tab" hint="Inviting the same address again replaces the earlier link.">
              <ul className="admin-list">
                {sent.map((i) => (
                  <li key={i.email}>
                    <span className="admin-avatar admin-avatar--sm" aria-hidden="true">{i.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="admin-cell-strong truncate">{i.name}</p>
                      <p className="admin-cell-sub truncate">{i.email}</p>
                    </div>
                    <span className="admin-role">{roleLabel(i.role)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <Panel title="Roles" hint="Each person has one role.">
          <dl className="admin-roles">
            {ROLES.map((r) => (
              <div key={r.key}>
                <dt>{r.label}</dt>
                <dd>{r.description}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  )
}

export default Staff
