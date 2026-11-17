import { useFilters } from '../services/useLocation'
import {
  AdminHeader,
  AdminTable,
  NameCell,
  Panel,
  StatusPill,
} from './AdminParts'
import {
  AppLink,
  ActivityList,
  EditForm,
  ExternalLink,
  Facts,
  FilterBar,
  FilterSelect,
  Pagination,
  RefreshButton,
  ResourceState,
  SavedViews,
} from './DataParts'
import { TextField } from './FormParts'
import { RelatedEmails } from './Logs'
import { detailId } from '../navigation'
import { adminEndpoint, collection, patchAdmin } from '../services/admin'
import { useResource } from '../services/useResource'
import { useSession } from '../services/hooks'
import { can } from '../permissions'
import {
  BILLING_STATUSES,
  dateTime,
  label,
  money,
  ONBOARDING_STATUSES,
  person,
  PLAN_KEYS,
} from '../data/format'

const columns = [
  {
    key: 'bakery',
    sortable: true,
    sortKey: 'email',
    label: 'Bakery',
    render: (s) => (
      <AppLink to={`/subscriptions/${s.id}`}>
        <NameCell name={s.lead?.businessName || s.email} sub={s.email} />
      </AppLink>
    ),
  },
  {
    key: 'contact',
    label: 'Contact',
    render: (s) => (
      <div>
        {s.lead?.name || '—'}
        <p className="admin-cell-sub">{s.lead?.phone}</p>
      </div>
    ),
  },
  {
    key: 'planKey',
    label: 'Plan',
    render: (s) => (
      <div>
        {label(s.planKey)}
        <p className="admin-cell-sub">{label(s.billingInterval)}</p>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Billing',
    render: (s) => (
      <div className="admin-inline">
        <StatusPill status={s.status} />
        {s.cancelAtPeriodEnd && <StatusPill status="cancelling" />}
      </div>
    ),
  },
  {
    key: 'onboardingStatus',
    label: 'Onboarding',
    render: (s) => <StatusPill status={s.onboardingStatus} />,
  },
  {
    key: 'onboardingAssignedTo',
    label: 'Onboarding owner',
    render: (s) => person(s.onboardingAssignedTo),
  },
  {
    key: 'trialEndsAt',
    sortable: true,
    label: 'Trial ends',
    render: (s) => dateTime(s.trialEndsAt),
  },
  {
    key: 'createdAt',
    sortable: true,
    label: 'Started',
    render: (s) => dateTime(s.createdAt),
  },
]
const views = [
  ['All subscriptions', {}],
  ['Needs onboarding', { onboardingStatus: 'pending' }],
  ['In progress', { onboardingStatus: 'in_progress' }],
  [
    'My onboardings',
    { assignedTo: 'me', onboardingStatus: 'pending,in_progress' },
  ],
  ['Trials ending this week', { trialEndsWithin: '7' }],
  ['Payment problems', { status: 'past_due' }],
  ['Cancelling', { cancelling: 'true' }],
]

const SubscriptionList = () => {
  const [filters, setFilters] = useFilters()
  const resource = useResource(adminEndpoint('subscriptions', filters))
  const assignees = useResource(adminEndpoint('subscriptions/assignees'))
  const { rows, pagination } = collection(resource.data, 'subscriptions')
  const people = collection(assignees.data, 'assignees').rows.map((s) => ({
    key: s.id,
    name: s.name,
  }))
  const filter = (name, title, options, multiple = false) => (
    <FilterSelect
      key={name}
      name={name}
      label={title}
      options={options}
      multiple={multiple}
      filters={filters}
      setFilters={setFilters}
    />
  )
  return (
    <div className="admin-page">
      <AdminHeader
        title="Subscriptions"
        subtitle="Bakery subscriptions, billing health and onboarding progress."
        actions={<RefreshButton resource={resource} />}
      />
      <SavedViews views={views} filters={filters} setFilters={setFilters} />
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        placeholder="Bakery, email, name or phone"
      >
        {filter('status', 'Billing status', BILLING_STATUSES, true)}
        {filter('onboardingStatus', 'Onboarding', ONBOARDING_STATUSES, true)}
        {filter('assignedTo', 'Onboarding owner', [
          { key: 'me', name: 'My onboardings' },
          { key: 'unassigned', name: 'Unassigned' },
          ...people,
        ])}
        {filter('planKey', 'Plan', PLAN_KEYS)}
        {filter('billingInterval', 'Billing interval', [
          { key: 'month', name: 'Monthly' },
          { key: 'year', name: 'Yearly' },
        ])}
        <TextField
          name="trialEndsWithin"
          label="Trial ends within (days)"
          type="number"
          min={1}
          max={90}
          value={filters.trialEndsWithin ?? ''}
          onChange={(e) => setFilters({ trialEndsWithin: e.target.value })}
        />
        {filter('cancelling', 'Cancellation', [
          { key: 'true', name: 'Cancelling at period end' },
        ])}
        {filter('sort', 'Sort by', [
          { key: 'createdAt', name: 'Started' },
          { key: 'trialEndsAt', name: 'Trial ends' },
          { key: 'currentPeriodEnd', name: 'Current period ends' },
          { key: 'email', name: 'Email' },
        ])}
        {filter('order', 'Order', [
          { key: 'desc', name: 'Descending' },
          { key: 'asc', name: 'Ascending' },
        ])}
      </FilterBar>
      {assignees.error && <ResourceState resource={assignees} />}
      <ResourceState resource={resource}>
        <AdminTable
          sort={filters.sort || 'createdAt'}
          order={filters.order || 'desc'}
          onSort={(sort) =>
            setFilters({
              sort,
              order:
                (filters.sort || 'createdAt') === sort &&
                (filters.order || 'desc') === 'desc'
                  ? 'asc'
                  : 'desc',
            })
          }
          columns={columns}
          rows={rows}
          empty="No subscriptions match these filters."
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

const SubscriptionDetail = ({ id }) => {
  const { staff } = useSession()
  const resource = useResource(adminEndpoint(`subscriptions/${id}`))
  const assignees = useResource(
    can(staff, 'onboarding:update')
      ? adminEndpoint('subscriptions/assignees')
      : null,
  )
  const s = resource.data?.data
  const people = collection(assignees.data, 'assignees').rows.map((p) => ({
    key: p.id,
    name: p.name,
  }))
  const initial = s && {
    onboardingStatus: s.onboardingStatus,
    assignedTo:
      s.onboardingAssignedTo?.id ??
      (typeof s.onboardingAssignedTo === 'string'
        ? s.onboardingAssignedTo
        : ''),
    notes: s.onboardingNotes ?? '',
  }
  return (
    <div className="admin-page">
      <AppLink to="/subscriptions">← All subscriptions</AppLink>
      <ResourceState resource={resource}>
        {s && (
          <>
            <AdminHeader
              title={s.lead?.businessName || s.email}
              subtitle={`${label(s.planKey)} · ${label(s.billingInterval)}`}
              actions={<RefreshButton resource={resource} />}
            />
            <div className="admin-split">
              <div className="admin-stack">
                <Panel title="Subscription">
                  <Facts
                    items={[
                      [
                        'Billing status',
                        <div className="admin-inline">
                          <StatusPill status={s.status} />
                          {s.cancelAtPeriodEnd && (
                            <StatusPill status="cancelling" />
                          )}
                        </div>,
                      ],
                      [
                        'Onboarding',
                        <StatusPill status={s.onboardingStatus} />,
                      ],
                      ['Onboarding owner', person(s.onboardingAssignedTo)],
                      ['Contact', s.lead?.name || s.email],
                      ['Email', s.email],
                      ['Phone', s.lead?.phone],
                      [
                        'Price',
                        s.price
                          ? `${money(s.price.amount, s.price.currency)} / ${label(s.billingInterval).toLowerCase()}`
                          : 'Sold by quote',
                      ],
                      ['Trial ends', dateTime(s.trialEndsAt)],
                      ['Current period ends', dateTime(s.currentPeriodEnd)],
                      ['Cancelled at', dateTime(s.canceledAt)],
                      ['Started', dateTime(s.createdAt)],
                      ['Went live', dateTime(s.wentLiveAt)],
                    ]}
                  />
                  <div className="admin-inline admin-detail-links">
                    {s.lead?.id && can(staff, 'leads:view') && (
                      <AppLink to={`/leads/${s.lead.id}`}>View lead</AppLink>
                    )}
                    <ExternalLink to={s.stripe?.customerUrl}>
                      Customer in Stripe
                    </ExternalLink>
                    <ExternalLink to={s.stripe?.subscriptionUrl}>
                      Subscription in Stripe
                    </ExternalLink>
                  </div>
                </Panel>
                <Panel title="Onboarding notes">
                  <p className="admin-prose">
                    {s.onboardingNotes || 'No notes yet.'}
                  </p>
                </Panel>
                <Panel title="Onboarding history">
                  <ActivityList
                    items={s.history}
                    render={() => 'Onboarding updated'}
                  />
                </Panel>
                {can(staff, 'email_logs:view') && (
                  <RelatedEmails subscriptionId={id} />
                )}
              </div>
              {can(staff, 'onboarding:update') && (
                <Panel
                  title="Manage onboarding"
                  hint="Billing and plan changes are managed in Stripe."
                >
                  <ResourceState resource={assignees}>
                    <EditForm
                      key={JSON.stringify(initial)}
                      initial={initial}
                      definitions={[
                        {
                          key: 'onboardingStatus',
                          title: 'Onboarding status',
                          options: ONBOARDING_STATUSES,
                        },
                        {
                          key: 'assignedTo',
                          title: 'Onboarding owner',
                          options: [{ key: '', name: 'Unassigned' }, ...people],
                        },
                        {
                          key: 'notes',
                          title: 'Notes',
                          type: 'textarea',
                          hint: 'Saving replaces the current notes. History keeps a preview.',
                        },
                      ]}
                      confirmChange={(changes) =>
                        changes.onboardingStatus === 'live'
                          ? 'Mark this bakery as live? This tells the team that setup is complete and the bakery is running.'
                          : null
                      }
                      onSave={(changes) =>
                        patchAdmin(
                          `subscriptions/${id}/onboarding`,
                          Object.fromEntries(
                            Object.entries(changes).map(([key, value]) => [
                              key,
                              value === '' ? null : value,
                            ]),
                          ),
                        )
                      }
                      onSaved={resource.replace}
                    />
                  </ResourceState>
                </Panel>
              )}
            </div>
          </>
        )}
      </ResourceState>
    </div>
  )
}

const Subscriptions = () => {
  const id = detailId()
  return id ? <SubscriptionDetail key={id} id={id} /> : <SubscriptionList />
}
export default Subscriptions
