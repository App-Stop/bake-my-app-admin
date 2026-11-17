import { useFilters } from '../services/useLocation'
import { useState } from 'react'
import { Send } from 'lucide-react'
import {
  AdminHeader,
  AdminTable,
  NameCell,
  Panel,
  StatusPill,
} from './AdminParts'
import { Alert, Button, SelectField, TextField } from './FormParts'
import {
  ActionButton,
  ActivityList,
  AppLink,
  EditForm,
  Facts,
  FilterBar,
  FilterSelect,
  Pagination,
  RefreshButton,
  ResourceState,
} from './DataParts'
import {
  adminEndpoint,
  collection,
  deleteAdmin,
  patchAdmin,
  postAdmin,
} from '../services/admin'
import { endSession, updateStaff } from '../services/api'
import { useResource } from '../services/useResource'
import { useSession, useSubmit } from '../services/hooks'
import { dateTime, label, person } from '../data/format'
import { detailId } from '../navigation'

const staffStatus = (s) =>
  s.isActive === false ? 'off' : s.isLocked ? 'locked' : 'active'

const InviteForm = ({ roles, onSent }) => {
  const [form, setForm] = useState({ name: '', email: '', role: '' })
  const [sentTo, setSentTo] = useState('')
  const submit = useSubmit(['name', 'email', 'role'])
  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setSentTo('')
    submit.clearField(key)
  }
  const selectedRole = roles.find((role) => role.key === form.role)
  return (
    <Panel
      title="Invite someone"
      hint="Inviting the same address again replaces the earlier link."
    >
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const invite = {
            ...form,
            name: form.name.trim(),
            email: form.email.trim(),
          }
          const { ok } = await submit.run(() =>
            postAdmin('staff/invites', invite),
          )
          if (ok) {
            setSentTo(invite.email)
            setForm({ name: '', email: '', role: form.role })
            onSent()
          }
        }}
      >
        <div className="admin-form-row">
          <TextField
            label="Full name"
            value={form.name}
            onChange={set('name')}
            error={submit.fields.name}
            required
          />
          <TextField
            label="Work email"
            type="email"
            value={form.email}
            onChange={set('email')}
            error={submit.fields.email}
            required
          />
        </div>
        <SelectField
          label="Role"
          value={form.role}
          onChange={set('role')}
          error={submit.fields.role}
          required
        >
          <option value="">Choose a role</option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </SelectField>
        <p className="admin-field-hint">
          {selectedRole?.permissions?.includes('*')
            ? 'Full access to the admin panel.'
            : selectedRole?.permissions?.map(label).join(' · ')}
        </p>
        {submit.error && <Alert>{submit.error}</Alert>}
        {sentTo && <Alert tone="success">Invitation sent to {sentTo}.</Alert>}
        <div className="admin-form-actions">
          <Button
            type="submit"
            loading={submit.loading}
            disabled={!roles.length}
          >
            <Send size={16} />
            Send invitation
          </Button>
        </div>
      </form>
    </Panel>
  )
}

const StaffList = () => {
  const [filters, setFilters] = useFilters()
  const resource = useResource(adminEndpoint('staff', filters))
  const roleResource = useResource(adminEndpoint('staff/roles'))
  const invites = useResource(adminEndpoint('staff/invites'))
  const { rows, pagination } = collection(resource.data, 'staff')
  const roles = collection(roleResource.data, 'roles').rows
  const pending = collection(invites.data, 'invites').rows
  return (
    <div className="admin-page">
      <AdminHeader
        title="Staff"
        subtitle="Manage panel access, roles and pending invitations."
        actions={<RefreshButton resource={resource} />}
      />
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        placeholder="Name or email"
      >
        <FilterSelect
          label="Role"
          name="role"
          options={roles}
          filters={filters}
          setFilters={setFilters}
        />
        <FilterSelect
          label="Status"
          name="status"
          options={['active', 'inactive']}
          filters={filters}
          setFilters={setFilters}
        />
      </FilterBar>
      <ResourceState resource={resource}>
        <AdminTable
          rows={rows}
          empty="No staff match these filters."
          columns={[
            {
              key: 'name',
              label: 'Staff member',
              render: (s) => (
                <AppLink to={`/staff/${s.id}`}>
                  <NameCell name={s.name || s.email} sub={s.email} />
                </AppLink>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (s) =>
                s.roleName ||
                roles.find((r) => r.key === s.role)?.name ||
                label(s.role),
            },
            {
              key: 'status',
              label: 'Status',
              render: (s) => <StatusPill status={staffStatus(s)} />,
            },
            {
              key: 'lastLoginAt',
              label: 'Last sign-in',
              render: (s) => dateTime(s.lastLoginAt),
            },
          ]}
        />
        <Pagination
          pagination={pagination}
          filters={filters}
          setFilters={setFilters}
        />
      </ResourceState>
      <div className="admin-split">
        <div className="admin-stack">
          <ResourceState resource={roleResource}>
            <InviteForm roles={roles} onSent={invites.reload} />
          </ResourceState>
          <Panel
            title="Pending invitations"
            hint="Expired invitations can be resent with a fresh link."
            action={<RefreshButton resource={invites} />}
          >
            <ResourceState resource={invites}>
              {pending.length ? (
                <ul className="admin-timeline">
                  {pending.map((i) => (
                    <li key={i.id}>
                      <div className="admin-inline admin-spread">
                        <div>
                          <strong>{i.name || i.email}</strong>
                          <p className="admin-cell-sub">
                            {i.email} ·{' '}
                            {roles.find((r) => r.key === i.role)?.name ??
                              label(i.role)}
                          </p>
                        </div>
                        <StatusPill
                          status={i.expired ? 'expired' : 'pending'}
                        />
                      </div>
                      <p className="admin-cell-sub">
                        Invited by {person(i.invitedBy)} · Expires{' '}
                        {dateTime(i.expiresAt)}
                      </p>
                      <div className="admin-inline">
                        <ActionButton
                          action={() =>
                            postAdmin('staff/invites', {
                              email: i.email,
                              ...(i.name && { name: i.name }),
                              role: i.role,
                            })
                          }
                          onDone={invites.reload}
                        >
                          Resend
                        </ActionButton>
                        <ActionButton
                          confirm={`Cancel the invitation for ${i.email}? Their emailed link will stop working immediately.`}
                          action={() => deleteAdmin(`staff/invites/${i.id}`)}
                          onDone={invites.reload}
                        >
                          Cancel invitation
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-card-hint">No pending invitations.</p>
              )}
            </ResourceState>
          </Panel>
        </div>
        <Panel title="Roles" hint="Permissions come from the server.">
          <ResourceState resource={roleResource}>
            <dl className="admin-roles">
              {roles.map((r) => (
                <div key={r.key}>
                  <dt>
                    {r.name} · {r.activeStaff ?? 0} active
                  </dt>
                  <dd>
                    {r.permissions?.includes('*')
                      ? 'Full access to the admin panel.'
                      : r.permissions?.map(label).join(' · ')}
                  </dd>
                </div>
              ))}
            </dl>
          </ResourceState>
        </Panel>
      </div>
    </div>
  )
}

const StaffDetail = ({ id }) => {
  const { staff: me } = useSession()
  const resource = useResource(adminEndpoint(`staff/${id}`))
  const roleResource = useResource(adminEndpoint('staff/roles'))
  const s = resource.data?.data
  const roles = collection(roleResource.data, 'roles').rows
  const own = me.id === id
  const replace = (response) => {
    resource.replace(response)
    if (own) updateStaff(response.data)
  }
  const initial = s && { name: s.name ?? '', role: s.role }
  return (
    <div className="admin-page">
      <AppLink to="/staff">← All staff</AppLink>
      <ResourceState resource={resource}>
        {s && (
          <>
            <AdminHeader
              title={s.name || s.email}
              subtitle={s.email}
              actions={<RefreshButton resource={resource} />}
            />
            <div className="admin-split">
              <div className="admin-stack">
                <Panel title="Account">
                  <Facts
                    items={[
                      [
                        'Role',
                        s.roleName ??
                          roles.find((r) => r.key === s.role)?.name ??
                          label(s.role),
                      ],
                      ['Status', <StatusPill status={staffStatus(s)} />],
                      ['Last sign-in', dateTime(s.lastLoginAt)],
                      ['Signed-in devices', s.activeSessions ?? 0],
                      ['Locked until', dateTime(s.lockedUntil)],
                    ]}
                  />
                  <div className="admin-inline admin-detail-links">
                    <ActionButton
                      confirm={
                        own
                          ? 'Sign yourself out on every device? You will return to the sign-in screen.'
                          : `Sign ${s.name || s.email} out on every device? They can sign in again afterwards.`
                      }
                      action={() => postAdmin(`staff/${id}/revoke-sessions`)}
                      onDone={(response) =>
                        own ? endSession() : replace(response)
                      }
                    >
                      Sign out everywhere
                    </ActionButton>
                    {s.lockedUntil && (
                      <ActionButton
                        action={() => postAdmin(`staff/${id}/unlock`)}
                        onDone={replace}
                      >
                        Unlock account
                      </ActionButton>
                    )}
                    {!own && (
                      <ActionButton
                        variant={s.isActive ? 'danger' : 'secondary'}
                        confirm={
                          s.isActive
                            ? `Switch off ${s.name || s.email}? They will be signed out on all devices and unable to sign in.`
                            : null
                        }
                        action={() =>
                          patchAdmin(`staff/${id}`, { isActive: !s.isActive })
                        }
                        onDone={replace}
                      >
                        {s.isActive
                          ? 'Switch off account'
                          : 'Switch on account'}
                      </ActionButton>
                    )}
                  </div>
                </Panel>
                <Panel title="Permissions">
                  <div className="admin-permissions">
                    {s.permissions?.includes('*') ? (
                      <span className="admin-role">Full access</span>
                    ) : (
                      (s.permissions ?? []).map((p) => (
                        <span className="admin-role" key={p}>
                          {label(p)}
                        </span>
                      ))
                    )}
                  </div>
                </Panel>
                <Panel
                  title="Recent activity"
                  action={
                    <AppLink to={`/audit-logs?staffUserId=${id}`}>
                      See everything
                    </AppLink>
                  }
                >
                  <ActivityList items={s.recentActivity} />
                </Panel>
              </div>
              <Panel title="Edit staff member">
                <ResourceState resource={roleResource}>
                  <EditForm
                    key={JSON.stringify(initial)}
                    initial={initial}
                    definitions={[
                      { key: 'name', title: 'Name', required: true },
                      {
                        key: 'role',
                        title: 'Role',
                        disabled: own,
                        hint: own
                          ? 'You cannot change your own role or switch yourself off.'
                          : 'Changing a role takes effect on the next request.',
                        options: roles,
                      },
                    ]}
                    confirmChange={(changes) => {
                      if (!changes.role) return null
                      const next = roles.find((r) => r.key === changes.role)
                      const lost = (s.permissions ?? []).filter(
                        (permission) =>
                          !next?.permissions?.includes('*') &&
                          !next?.permissions?.includes(permission),
                      )
                      return `Change ${s.name || s.email}'s role to ${next?.name ?? label(changes.role)}? ${lost.length ? `They will lose access to ${lost.includes('*') ? 'the full set of administrator permissions' : lost.map(label).join(', ')}.` : 'Their permissions will change immediately.'}`
                    }}
                    onSave={(changes) => patchAdmin(`staff/${id}`, changes)}
                    onSaved={replace}
                  />
                </ResourceState>
              </Panel>
            </div>
          </>
        )}
      </ResourceState>
    </div>
  )
}

const Staff = () => {
  const id = detailId()
  return id ? <StaffDetail key={id} id={id} /> : <StaffList />
}
export default Staff
