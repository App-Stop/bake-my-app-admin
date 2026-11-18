import { useEffect, useState } from 'react'
import { Ban, Plus, RotateCcw, Send } from 'lucide-react'
import { useFilters } from '../services/useLocation'
import {
  AdminHeader,
  AdminTable,
  NameCell,
  Panel,
  StatusPill,
} from './AdminParts'
import {
  ActionButton,
  ActivityList,
  AppLink,
  Dialog,
  Facts,
  FilterBar,
  FilterSelect,
  Pagination,
  RefreshButton,
  ResourceState,
  TextAreaField,
} from './DataParts'
import { Alert, Button, TextField } from './FormParts'
import {
  adminEndpoint,
  collection,
  patchAdmin,
  postAdmin,
} from '../services/admin'
import { useResource } from '../services/useResource'
import { useSession, useSubmit } from '../services/hooks'
import { detailId, navigateAdmin } from '../navigation'
import { can } from '../permissions'
import {
  actionLabel,
  dateOnly,
  dateTime,
  label,
  TENANT_STATUSES,
} from '../data/format'

/* ---------- Helpers ---------- */

// Mirrors the server's rule closely enough for a preview; the server has the
// final say and adds -2, -3… when the address is taken.
const slugFrom = (name = '') =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')

const SLUG_RULE = /^[a-z0-9-]{3,40}$/

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'es'}`

const branchSummary = (branches) => {
  if (!branches) return '—'
  const total = branches.total ?? 0
  const off = total - (branches.active ?? 0)
  if (!total) return 'No branches yet'
  return `${plural(total, 'branch')}${off > 0 ? `, ${off} switched off` : ''}`
}

const lastSignIn = (value) =>
  value ? `Last sign-in ${dateTime(value)}` : 'Has not signed in yet'

const activityLabel = (action) => {
  const known = actionLabel(action)
  return known === action
    ? label(String(action ?? '').replace(/^tenant./, 'bakery.'))
    : known
}

// The create dialog hands the invite result to the bakery page it opens.
let createdFlash = null

/* ---------- Create bakery (used on the subscription page) ---------- */

const DEFAULTS = {
  currencyCode: 'PKR',
  currencySymbol: 'Rs',
  timezone: 'Asia/Karachi',
}
const MORE_FIELDS = Object.keys(DEFAULTS)
const CREATE_FIELDS = ['name', 'slug', 'ownerName', 'ownerEmail', ...MORE_FIELDS]

const timezones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
})()

const CreateBakeryDialog = ({ subscription, onClose, onConflict }) => {
  const [form, setForm] = useState({
    name: subscription.lead?.businessName ?? '',
    slug: '',
    ownerName: subscription.lead?.name ?? '',
    ownerEmail: subscription.email ?? '',
    ...DEFAULTS,
  })
  const [more, setMore] = useState(false)
  const [slugError, setSlugError] = useState(null)
  const submit = useSubmit(CREATE_FIELDS)
  const set = (key, transform = (v) => v) => (e) => {
    setForm({ ...form, [key]: transform(e.target.value) })
    submit.clearField(key)
    if (key === 'slug') setSlugError(null)
  }
  const preview = form.slug || slugFrom(form.name)
  const conflict = submit.status === 409

  const create = async (e) => {
    e.preventDefault()
    if (form.slug && !SLUG_RULE.test(form.slug)) {
      setSlugError('Use 3 to 40 lowercase letters, digits and hyphens.')
      return
    }
    const body = {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
      ...(form.slug && { slug: form.slug }),
    }
    // Only send the extras someone actually changed.
    for (const key of MORE_FIELDS) {
      const value = form[key].trim()
      if (value && value !== DEFAULTS[key]) body[key] = value
    }
    const { ok, result, error } = await submit.run(() =>
      postAdmin(`subscriptions/${subscription.id}/create-tenant`, body),
    )
    if (ok) {
      const tenant = result.data?.tenant
      createdFlash = { tenantId: tenant?.id, invite: result.data?.invite }
      navigateAdmin(`/bakeries/${tenant?.id}`)
      return
    }
    if (error?.fields?.some((f) => MORE_FIELDS.includes(f.path))) setMore(true)
  }

  return (
    <Dialog
      title="Create bakery"
      description="This sets up the bakery's own login and emails the owner a one-time link (valid 48 hours) to the bakery panel."
      onClose={onClose}
      busy={submit.loading}
    >
      <form className="admin-form" onSubmit={create}>
        <TextField
          label="Bakery name"
          name="name"
          placeholder="Sweet Crumbs"
          value={form.name}
          onChange={set('name')}
          error={submit.fields.name}
          maxLength={120}
          required
        />
        <TextField
          label="Address name (optional)"
          name="slug"
          placeholder={slugFrom(form.name) || 'sweet-crumbs'}
          value={form.slug}
          onChange={set('slug', (v) =>
            v
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
          )}
          error={slugError ?? submit.fields.slug}
          maxLength={40}
          hint={
            <>
              {preview ? (
                <>
                  Address: <strong>{preview}</strong>
                  {!form.slug && ' (a number is added if it is taken)'}.{' '}
                </>
              ) : (
                'Leave empty and one is made from the name. '
              )}
              It cannot easily change later.
            </>
          }
        />
        <div className="admin-form-row">
          <TextField
            label="Owner's name"
            name="ownerName"
            value={form.ownerName}
            onChange={set('ownerName')}
            error={submit.fields.ownerName}
            required
          />
          <TextField
            label="Owner's email"
            name="ownerEmail"
            type="email"
            value={form.ownerEmail}
            onChange={set('ownerEmail')}
            error={submit.fields.ownerEmail}
            hint="The invitation goes here."
            required
          />
        </div>
        <details
          className="admin-more"
          open={more}
          onToggle={(e) => setMore(e.currentTarget.open)}
        >
          <summary>More options</summary>
          <div className="admin-more-body">
            <div className="admin-form-row">
              <TextField
                label="Currency code"
                name="currencyCode"
                value={form.currencyCode}
                onChange={set('currencyCode', (v) => v.toUpperCase())}
                error={submit.fields.currencyCode}
                maxLength={3}
              />
              <TextField
                label="Currency symbol"
                name="currencySymbol"
                value={form.currencySymbol}
                onChange={set('currencySymbol')}
                error={submit.fields.currencySymbol}
                maxLength={8}
              />
            </div>
            <TextField
              label="Timezone"
              name="timezone"
              list="admin-timezones"
              value={form.timezone}
              onChange={set('timezone')}
              error={submit.fields.timezone}
            />
            <datalist id="admin-timezones">
              {timezones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </div>
        </details>
        {conflict ? (
          <Alert
            action={
              <Button variant="secondary" onClick={onConflict}>
                Refresh
              </Button>
            }
          >
            This subscription already has a bakery. Refresh to see it.
          </Alert>
        ) : (
          submit.error && <Alert>{submit.error}</Alert>
        )}
        <div className="admin-form-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submit.loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submit.loading} disabled={conflict}>
            Create bakery
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// The "Bakery" panel on a subscription: the bakery, or the way to create it.
export const SubscriptionBakery = ({ subscription: s, onChanged }) => {
  const { staff } = useSession()
  const [open, setOpen] = useState(false)
  const tenant = s.tenant
  const cancelled = s.status === 'cancelled'
  const canCreate = can(staff, 'tenants:create')
  return (
    <Panel title="Bakery">
      {tenant ? (
        <div className="admin-bakery-link">
          {can(staff, 'tenants:view') ? (
            <AppLink to={`/bakeries/${tenant.id}`}>
              <NameCell name={tenant.name} sub={tenant.slug} />
            </AppLink>
          ) : (
            <NameCell name={tenant.name} sub={tenant.slug} />
          )}
          <StatusPill status={tenant.status} />
        </div>
      ) : cancelled ? (
        <p className="admin-card-hint">
          No bakery. A cancelled subscription cannot get one.
        </p>
      ) : canCreate ? (
        <div className="admin-manage-section">
          <p>
            No bakery yet. Creating one gives the customer their own login
            and emails the owner an invitation.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Create bakery
          </Button>
        </div>
      ) : (
        <p className="admin-card-hint">
          No bakery yet. Onboarding or a super admin creates it.
        </p>
      )}
      {open && (
        <CreateBakeryDialog
          subscription={s}
          onClose={() => setOpen(false)}
          onConflict={() => {
            setOpen(false)
            onChanged()
          }}
        />
      )}
    </Panel>
  )
}

/* ---------- List ---------- */

const ownerCell = (t) =>
  t.owner ? (
    <div>
      {t.owner.name || t.owner.email}
      <p className="admin-cell-sub">{t.owner.email}</p>
      <p className="admin-cell-sub">{lastSignIn(t.owner.lastLoginAt)}</p>
    </div>
  ) : t.pendingOwnerInvite ? (
    <StatusPill status="invitation_pending" />
  ) : (
    <span className="admin-cell-sub">No owner yet</span>
  )

const columns = [
  {
    key: 'name',
    label: 'Bakery',
    render: (t) => (
      <AppLink to={`/bakeries/${t.id}`}>
        <NameCell name={t.name} />
      </AppLink>
    ),
  },
  { key: 'slug', label: 'Address name', render: (t) => t.slug },
  {
    key: 'status',
    label: 'Status',
    render: (t) => <StatusPill status={t.status} />,
  },
  {
    key: 'plan',
    label: 'Plan',
    render: (t) => (
      <div>
        {label(t.plan?.key)}
        {t.plan?.interval && (
          <p className="admin-cell-sub">{label(t.plan.interval)}</p>
        )}
      </div>
    ),
  },
  { key: 'owner', label: 'Owner', render: ownerCell },
  {
    key: 'createdAt',
    label: 'Created',
    render: (t) => dateTime(t.createdAt),
  },
]

const BakeryList = () => {
  const [filters, setFilters] = useFilters()
  const resource = useResource(adminEndpoint('tenants', filters))
  const { rows, pagination } = collection(resource.data, 'tenants')
  return (
    <div className="admin-page">
      <AdminHeader
        title="Bakeries"
        subtitle="Every bakery made from a subscription, its owner and whether it is live."
        actions={<RefreshButton resource={resource} />}
      />
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        placeholder="Bakery, address name, or a person's name or email"
      >
        <FilterSelect
          label="Status"
          name="status"
          options={TENANT_STATUSES}
          multiple
          filters={filters}
          setFilters={setFilters}
        />
      </FilterBar>
      <ResourceState resource={resource}>
        <AdminTable
          columns={columns}
          rows={rows}
          empty="No bakeries match these filters."
        />
        <Pagination
          pagination={pagination}
          filters={filters}
          setFilters={setFilters}
        />
      </ResourceState>
    </div>
  )
}

/* ---------- Detail actions ---------- */

const SuspendDialog = ({ tenant, onClose, onDone }) => {
  const [reason, setReason] = useState('')
  const submit = useSubmit(['reason'])
  const trimmed = reason.trim()
  return (
    <Dialog
      title={`Suspend ${tenant.name}?`}
      description="Everyone at the bakery is signed out at once and nobody can sign in. The bakery's app stops getting its config and falls back to its defaults. You can reactivate it later."
      onClose={onClose}
      busy={submit.loading}
    >
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const { ok, result } = await submit.run(() =>
            patchAdmin(`tenants/${tenant.id}/status`, {
              action: 'suspend',
              reason: trimmed,
            }),
          )
          if (ok) onDone(result)
        }}
      >
        <TextAreaField
          label="Reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            submit.clearField('reason')
          }}
          error={submit.fields.reason}
          hint={`Staff see this and it stays in the history. ${trimmed.length}/300`}
          minLength={3}
          maxLength={300}
          required
        />
        {submit.error && <Alert>{submit.error}</Alert>}
        <div className="admin-form-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submit.loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={submit.loading}
            disabled={trimmed.length < 3}
          >
            Suspend bakery
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

const inviteResult = (data, email) =>
  data?.emailSent === false
    ? {
        tone: 'warning',
        text: `The invitation was saved but the email to ${data?.email ?? email} did not go out. Try again in a moment.`,
      }
    : {
        tone: 'success',
        text: `A fresh invitation was emailed to ${data?.email ?? email}. The earlier link no longer works.`,
      }

const ResendInviteDialog = ({ tenant, onClose, onDone }) => {
  const previous = tenant.pendingInvites?.[0]?.email ?? ''
  const [form, setForm] = useState({ email: previous, name: '' })
  const submit = useSubmit(['email', 'name'])
  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    submit.clearField(key)
  }
  return (
    <Dialog
      title="Send owner invitation again"
      description="A fresh one-time link is emailed and the earlier link stops working. Change the address only if it was wrong."
      onClose={onClose}
      busy={submit.loading}
    >
      <form
        className="admin-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const email = form.email.trim()
          const name = form.name.trim()
          const body = {
            ...(email && email !== previous && { email }),
            ...(name && { name }),
          }
          const { ok, result, error } = await submit.run(() =>
            postAdmin(`tenants/${tenant.id}/owner-invite`, body),
          )
          if (ok) onDone(inviteResult(result.data, email || previous))
          else if (error?.status === 409)
            onDone({
              tone: 'info',
              text: 'The owner has already joined, so there is nothing to resend. They can use “Forgot password” on the bakery sign-in to get back in.',
            })
        }}
      >
        <TextField
          label="Owner's email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={submit.fields.email}
          hint={previous ? `Last sent to ${previous}.` : undefined}
          required={!previous}
        />
        <TextField
          label="Owner's name (optional)"
          value={form.name}
          onChange={set('name')}
          error={submit.fields.name}
          hint="Leave empty to keep the name from before."
        />
        {submit.error && <Alert>{submit.error}</Alert>}
        <div className="admin-form-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submit.loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submit.loading}>
            <Send size={16} /> Send invitation
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

const SendInviteAgain = ({ tenant, onSent, variant = 'secondary' }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Send size={16} /> Send invitation again
      </Button>
      {open && (
        <ResendInviteDialog
          tenant={tenant}
          onClose={() => setOpen(false)}
          onDone={(outcome) => {
            setOpen(false)
            onSent(outcome)
          }}
        />
      )}
    </>
  )
}

/* ---------- Detail ---------- */

const Branding = ({ tenant: t }) => {
  const theme = t.theme ?? {}
  const appName = theme.appName || t.name
  return (
    <Panel title="Branding" hint="Set by the bakery in its own panel.">
      <div className="admin-brand-row">
        {theme.logoUrl ? (
          <img
            className="admin-logo-preview"
            src={theme.logoUrl}
            alt={`${appName} logo`}
          />
        ) : (
          <span
            className="admin-logo-initial"
            style={{ background: theme.primary || 'var(--color-primary)' }}
            aria-hidden="true"
          >
            {appName?.[0] ?? '?'}
          </span>
        )}
        <div className="min-w-0">
          <p className="admin-cell-strong">{appName}</p>
          <p className="admin-cell-sub">
            {theme.logoUrl ? 'Logo uploaded' : 'No logo yet'}
          </p>
        </div>
      </div>
      <Facts
        items={[
          [
            'App colour',
            theme.primary ? (
              <span className="admin-inline">
                <span
                  className="admin-swatch"
                  style={{ background: theme.primary }}
                  aria-hidden="true"
                />
                {theme.primary}
              </span>
            ) : (
              'Default'
            ),
          ],
          ['App name', appName],
          ['Currency symbol', theme.currencySymbol],
          ['Currency', t.currencyCode],
          ['Timezone', t.timezone],
        ]}
      />
    </Panel>
  )
}

const People = ({ tenant: t }) => {
  const owners = t.owners ?? []
  const invites = t.pendingInvites ?? []
  return (
    <Panel title="People">
      <Facts
        items={[
          ['People with accounts', t.people ?? 0],
          ['Pending invitations', invites.length],
        ]}
      />
      <h3 className="admin-subhead">Owners</h3>
      {owners.length ? (
        <ul className="admin-people">
          {owners.map((o) => (
            <li key={o.id}>
              <div className="min-w-0">
                <p className="admin-cell-strong">{o.name || o.email}</p>
                <p className="admin-cell-sub">{o.email}</p>
                <p className="admin-cell-sub">{lastSignIn(o.lastLoginAt)}</p>
              </div>
              {o.isActive === false && <StatusPill status="switched_off" />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-card-hint admin-subhead-note">
          {invites.length
            ? 'Nobody has joined as owner yet. The invitation is pending.'
            : 'No owner yet.'}
        </p>
      )}
      {invites.length > 0 && (
        <>
          <h3 className="admin-subhead">Pending invitations</h3>
          <ul className="admin-people">
            {invites.map((i) => (
              <li key={i.id}>
                <div className="min-w-0">
                  <p className="admin-cell-strong">{i.email}</p>
                  <p className="admin-cell-sub">
                    {label(i.role)} · {i.expired ? 'Expired' : 'Expires'}{' '}
                    {dateTime(i.expiresAt)}
                  </p>
                </div>
                <StatusPill status={i.expired ? 'expired' : 'pending'} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}

const BakeryDetail = ({ id }) => {
  const { staff } = useSession()
  const resource = useResource(adminEndpoint(`tenants/${id}`))
  const [created] = useState(() =>
    createdFlash?.tenantId === id ? createdFlash.invite : null,
  )
  const [notice, setNotice] = useState(null)
  const [suspending, setSuspending] = useState(false)
  useEffect(() => {
    if (createdFlash?.tenantId === id) createdFlash = null
  }, [id])
  const t = resource.data?.data
  const canManage = can(staff, 'tenants:manage')
  const canInvite = can(staff, 'tenants:create') && !t?.owners?.length
  const suspended = t?.status === 'suspended'
  const activity = [...(t?.recentActivity ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  const replace = (response) => {
    resource.replace(response)
    setNotice(null)
  }
  const invited = (outcome) => {
    setNotice(outcome ?? null)
    resource.reload()
  }
  const showCreated = created && !notice

  return (
    <div className="admin-page">
      <AppLink to="/bakeries">← All bakeries</AppLink>
      <ResourceState resource={resource}>
        {t && (
          <>
            <AdminHeader
              title={t.name}
              subtitle={`${t.slug} · Created ${dateOnly(t.createdAt)}${t.wentLiveAt ? ` · Live since ${dateOnly(t.wentLiveAt)}` : ''}`}
              actions={<RefreshButton resource={resource} />}
            />
            {showCreated &&
              (created.emailSent === false ? (
                <Alert
                  tone="warning"
                  action={
                    canInvite && (
                      <SendInviteAgain tenant={t} onSent={invited} />
                    )
                  }
                >
                  Bakery created, but the invitation email to {created.email}{' '}
                  did not go out. Send it again.
                </Alert>
              ) : (
                <Alert tone="success">
                  Bakery created. An invitation was emailed to {created.email}.
                </Alert>
              ))}
            {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
            {suspended && (
              <Alert>
                <strong>Suspended {dateTime(t.suspendedAt)}.</strong> Reason:{' '}
                {t.suspendedReason || 'None given'}. Nobody at this bakery can
                sign in and its app gets no config.
              </Alert>
            )}
            <div className="admin-split">
              <div className="admin-stack">
                <Panel title="Overview">
                  <Facts
                    items={[
                      ['Status', <StatusPill status={t.status} />],
                      ['Address name', t.slug],
                      [
                        'Subscription',
                        t.subscriptionId ? (
                          <AppLink to={`/subscriptions/${t.subscriptionId}`}>
                            {label(t.plan?.key)}
                            {t.plan?.interval &&
                              ` · ${label(t.plan.interval)}`}
                          </AppLink>
                        ) : (
                          label(t.plan?.key)
                        ),
                      ],
                      [
                        'Billing',
                        t.plan?.status ? (
                          <StatusPill status={t.plan.status} />
                        ) : (
                          '—'
                        ),
                      ],
                      ['Branches', branchSummary(t.branches)],
                      ['Contact email', t.contactEmail],
                      ['Contact phone', t.contactPhone],
                      ['Created', dateTime(t.createdAt)],
                      ['Went live', dateTime(t.wentLiveAt)],
                      ...(suspended
                        ? [
                            ['Suspended', dateTime(t.suspendedAt)],
                            ['Suspension reason', t.suspendedReason],
                          ]
                        : []),
                    ]}
                  />
                </Panel>
                <People tenant={t} />
                <Branding tenant={t} />
                <Panel title="Recent activity">
                  <ActivityList
                    items={activity}
                    render={(item) => activityLabel(item.action)}
                    who={(item) => item.actor?.name ?? 'System'}
                  />
                </Panel>
              </div>
              {(canManage || canInvite) && (
                <Panel title="Manage bakery">
                  <div className="admin-stack">
                    {canInvite && (
                      <div className="admin-manage-section">
                        <h3 className="admin-cell-strong">
                          Owner invitation
                        </h3>
                        <p>
                          Nobody has joined as owner yet. Sending again emails
                          a fresh link and the earlier one stops working.
                        </p>
                        <SendInviteAgain tenant={t} onSent={invited} />
                      </div>
                    )}
                    {canManage && (
                      <div className="admin-manage-section">
                        <h3 className="admin-cell-strong">Access</h3>
                        {suspended ? (
                          <>
                            <p>
                              Reactivating lets people sign in again. The
                              bakery goes back to live or onboarding, following
                              its subscription.
                            </p>
                            <ActionButton
                              variant="primary"
                              confirm={`Reactivate ${t.name}? People at the bakery can sign in again and its app gets its config.`}
                              action={() =>
                                patchAdmin(`tenants/${id}/status`, {
                                  action: 'reactivate',
                                })
                              }
                              onDone={replace}
                            >
                              <RotateCcw size={16} /> Reactivate bakery
                            </ActionButton>
                          </>
                        ) : (
                          <>
                            <p>
                              Suspending signs everyone at the bakery out and
                              blocks sign-in until it is reactivated.
                            </p>
                            <Button
                              variant="danger"
                              onClick={() => setSuspending(true)}
                            >
                              <Ban size={16} /> Suspend bakery
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Panel>
              )}
            </div>
            {suspending && (
              <SuspendDialog
                tenant={t}
                onClose={() => setSuspending(false)}
                onDone={(response) => {
                  setSuspending(false)
                  replace(response)
                }}
              />
            )}
          </>
        )}
      </ResourceState>
    </div>
  )
}

const Bakeries = () => {
  const id = detailId()
  return id ? <BakeryDetail key={id} id={id} /> : <BakeryList />
}
export default Bakeries
