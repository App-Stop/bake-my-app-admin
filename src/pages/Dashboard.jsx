import { useFilters } from '../services/useLocation'
import { useEffect, useState } from 'react'
import { BarChart3, DollarSign, Store, UserPlus } from 'lucide-react'
import {
  AdminHeader,
  AdminTable,
  Panel,
  StatCard,
  StatusPill,
} from './AdminParts'
import {
  AppLink,
  Facts,
  FilterBar,
  RefreshButton,
  ResourceState,
} from './DataParts'
import { adminEndpoint } from '../services/admin'
import { useResource } from '../services/useResource'
import { useSession } from '../services/hooks'
import { pageAllowed } from '../permissions'
import { adminPaths, navigateAdmin } from '../navigation'
import { dateOnly, dateTime, karachiToday, label, money } from '../data/format'

const counts = (values) =>
  Array.isArray(values)
    ? values.map((v) => [label(v.status ?? v.source ?? v.key), v.count])
    : Object.entries(values ?? {}).map(([k, v]) => [label(k), v])

const Bars = ({ points, name }) => {
  const maximum = Math.max(1, ...points.map((p) => Number(p[1]) || 0))
  return points.length ? (
    <div
      className="admin-bars"
      role="img"
      aria-label={`${name}: ${points.map(([key, value]) => `${key}: ${value}`).join(', ')}`}
    >
      {points.map(([key, value], i) => (
        <div className="admin-bar-row" key={`${key}-${i}`}>
          <span>{key}</span>
          <div>
            <span
              style={{ width: `${Math.max(0, (value / maximum) * 100)}%` }}
            />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  ) : (
    <p className="admin-card-hint">No data in this range.</p>
  )
}

const QueueTable = ({ title, items, link }) => (
  <AdminTable
    title={title}
    action={<AppLink to={link}>View all</AppLink>}
    rows={items ?? []}
    columns={[
      {
        key: 'bakery',
        label: 'Bakery',
        render: (s) => (
          <AppLink to={`/subscriptions/${s.id}`}>
            {s.lead?.businessName ||
              s.businessName ||
              s.email ||
              'View subscription'}
          </AppLink>
        ),
      },
      {
        key: 'status',
        label: 'Billing',
        render: (s) => <StatusPill status={s.status} />,
      },
      {
        key: 'trialEndsAt',
        label: 'Trial ends',
        render: (s) => dateTime(s.trialEndsAt),
      },
    ]}
  />
)
const currencies = (entries) =>
  entries?.length
    ? entries.map((e) => money(e.amount, e.currency)).join(' · ')
    : '—'
const metric = (title, value, icon = BarChart3, highlight = false) => (
  <StatCard
    key={title}
    icon={icon}
    label={title}
    value={value ?? '—'}
    highlight={highlight}
  />
)

const Dashboard = () => {
  const [filters, setFilters] = useFilters()
  const [selectedPreset, setSelectedPreset] = useState('30')
  const query = Object.fromEntries(
    ['from', 'to']
      .filter((key) => filters[key])
      .map((key) => [key, filters[key]]),
  )
  const resource = useResource(adminEndpoint('dashboard', query))
  const { staff } = useSession()
  useEffect(() => {
    if (resource.error?.status === 403) {
      const page = [
        'leads',
        'subscriptions',
        'plans',
        'staff',
        'auditLogs',
        'emailLogs',
        'account',
      ].find((key) => pageAllowed(staff, key))
      navigateAdmin(adminPaths[page], { replace: true })
    }
  }, [resource.error, staff])
  const d = resource.data?.data
  const today = karachiToday()
  const daysAgo = (days) => {
    const from = new Date(`${today}T12:00:00+05:00`)
    from.setUTCDate(from.getUTCDate() - days + 1)
    return from.toISOString().slice(0, 10)
  }
  const presets = [
    { key: '7', label: 'Last 7 days', from: daysAgo(7) },
    { key: '30', label: 'Last 30 days', from: daysAgo(30) },
    { key: 'month', label: 'This month', from: `${today.slice(0, 7)}-01` },
  ]
  const matchingPresets = presets.filter(({ key, from }) =>
    !filters.from && !filters.to
      ? key === '30'
      : filters.from === from && filters.to === today,
  )
  const activePreset = (
    matchingPresets.find(({ key }) => key === selectedPreset) ?? matchingPresets[0]
  )?.key
  return (
    <div className="admin-page">
      <AdminHeader
        title="Dashboard"
        subtitle="An overview of leads, bakery onboarding and subscriptions."
        actions={<RefreshButton resource={resource} />}
      />
      <div className="admin-filters" role="group" aria-label="Date range">
        {presets.map(({ key, label, from }) => (
          <button
            key={key}
            type="button"
            className="admin-filter"
            aria-pressed={activePreset === key}
            onClick={() => {
              setSelectedPreset(key)
              setFilters({ from, to: today }, { reset: true })
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        dates
        search={false}
      />
      <ResourceState resource={resource}>
        {d && (
          <>
            <p className="admin-card-hint">
              {dateOnly(d.range?.from)} – {dateOnly(d.range?.to)} · Karachi time
              · Updated {dateTime(d.generatedAt)}
            </p>
            {d.leads && (
              <>
                <h2 className="admin-section-title">Leads</h2>
                <div className="admin-stats">
                  {metric('New leads', d.leads.newLeads, UserPlus, true)}
                  {metric(
                    'Conversion',
                    d.leads.conversionPercent == null
                      ? '—'
                      : `${d.leads.conversionPercent}%`,
                  )}
                  {metric('Spam blocked', d.leads.spamInRange)}
                  {metric('My open leads · now', d.leads.mine?.open)}
                </div>
                <div className="admin-grid">
                  <Panel title="Leads per day">
                    <Bars
                      name="Leads per day"
                      points={(d.leads.byDay ?? []).map((p) => [
                        p.day,
                        p.count,
                      ])}
                    />
                  </Panel>
                  <Panel title="Where leads come from">
                    <Bars
                      name="Sources"
                      points={(d.leads.bySource ?? []).map((p) => [
                        label(p.source),
                        p.count,
                      ])}
                    />
                  </Panel>
                  <Panel title="Pipeline now">
                    <Bars
                      name="Lead pipeline"
                      points={counts(d.leads.statusSnapshot)}
                    />
                  </Panel>
                  <Panel title="Needs attention · now">
                    <div className="admin-queue-links">
                      <AppLink to="/leads?status=new&assignedTo=unassigned">
                        {d.leads.needsAttention?.unassignedNew ?? 0} unassigned
                        new leads
                      </AppLink>
                      <AppLink to="/leads?followUp=due">
                        {d.leads.needsAttention?.followUpsDue ?? 0} follow-ups
                        due
                      </AppLink>
                      <AppLink to="/leads?assignedTo=me">
                        {d.leads.mine?.open ?? 0} leads in my queue
                      </AppLink>
                      <AppLink to="/leads?assignedTo=me&followUp=due">
                        {d.leads.mine?.followUpsDue ?? 0} of my follow-ups due
                      </AppLink>
                    </div>
                  </Panel>
                </div>
              </>
            )}
            {d.onboarding && (
              <>
                <h2 className="admin-section-title">Onboarding</h2>
                <div className="admin-stats">
                  {metric(
                    'Went live in range',
                    d.onboarding.wentLiveInRange,
                    Store,
                  )}
                  {metric(
                    'Average days to go live',
                    d.onboarding.avgDaysToLive,
                  )}
                  {metric('My open onboardings · now', d.onboarding.mine?.open)}
                </div>
                <div className="admin-grid">
                  <Panel title="Onboarding pipeline · now">
                    <Bars
                      name="Onboarding"
                      points={counts(d.onboarding.statusCounts)}
                    />
                    <div className="admin-queue-links admin-detail-links">
                      <AppLink to="/subscriptions?assignedTo=unassigned&onboardingStatus=pending,in_progress">
                        {d.onboarding.needsAttention?.unassigned ?? 0}{' '}
                        unassigned
                      </AppLink>
                      <AppLink to="/subscriptions?onboardingStatus=pending">
                        {d.onboarding.needsAttention?.waitingOverThreeDays ?? 0}{' '}
                        waiting over three days
                      </AppLink>
                      <AppLink to="/subscriptions?assignedTo=me&onboardingStatus=pending,in_progress">
                        My open onboardings
                      </AppLink>
                    </div>
                  </Panel>
                  <AdminTable
                    title="Waiting longest"
                    rows={d.onboarding.oldestWaiting ?? []}
                    columns={[
                      {
                        key: 'bakery',
                        label: 'Bakery',
                        render: (s) => (
                          <AppLink to={`/subscriptions/${s.id}`}>
                            {s.lead?.businessName || s.businessName || s.email}
                          </AppLink>
                        ),
                      },
                      {
                        key: 'createdAt',
                        label: 'Started',
                        render: (s) => dateTime(s.createdAt),
                      },
                    ]}
                  />
                </div>
              </>
            )}
            {d.subscriptions && (
              <>
                <h2 className="admin-section-title">Subscriptions</h2>
                <div className="admin-stats">
                  {metric(
                    'New subscriptions',
                    d.subscriptions.startedInRange,
                    Store,
                  )}
                  {metric(
                    'Trials ending in 7 days · now',
                    d.subscriptions.trialsEndingSoon?.count,
                  )}
                  {metric(
                    'Payment problems · now',
                    d.subscriptions.pastDue?.count,
                  )}
                  {metric('Cancelling · now', d.subscriptions.cancelling)}
                </div>
                <div className="admin-grid">
                  <Panel title="Billing states · now">
                    <Bars
                      name="Billing states"
                      points={counts(d.subscriptions.byStatus)}
                    />
                    <div className="admin-detail-links">
                      <AppLink to="/subscriptions?cancelling=true">
                        View cancelling subscriptions
                      </AppLink>
                    </div>
                  </Panel>
                  <Panel title="New subscriptions per day">
                    <Bars
                      name="New subscriptions per day"
                      points={(d.subscriptions.startedByDay ?? []).map((p) => [
                        p.day,
                        p.count,
                      ])}
                    />
                  </Panel>
                  <QueueTable
                    title="Trials ending in 7 days"
                    items={d.subscriptions.trialsEndingSoon?.items}
                    link="/subscriptions?trialEndsWithin=7"
                  />
                  <QueueTable
                    title="Payment problems"
                    items={d.subscriptions.pastDue?.items}
                    link="/subscriptions?status=past_due"
                  />
                </div>
              </>
            )}
            {d.revenue && (
              <>
                <h2 className="admin-section-title">Revenue estimates</h2>
                <div className="admin-stats">
                  {metric(
                    'Estimated monthly recurring revenue',
                    currencies(d.revenue.mrr),
                    DollarSign,
                    true,
                  )}
                  {metric('Paying customers', d.revenue.payingSubscriptions)}
                  {metric(
                    'Estimated added MRR if trials convert',
                    currencies(d.revenue.trialMrr),
                    DollarSign,
                  )}
                  {metric(
                    'Cancellations in range',
                    d.revenue.cancellationsInRange,
                  )}
                </div>
                <Panel
                  title="Revenue context"
                  hint="Estimates use plan prices and exclude Stripe coupons."
                >
                  <Facts
                    items={[
                      ['Trials', d.revenue.trialSubscriptions],
                      [
                        'Sold by quote, not in the total',
                        d.revenue.unpricedPayingSubscriptions ?? 0,
                      ],
                      [
                        'Failed payments, last 30 days',
                        d.revenue.failedPaymentsLast30Days,
                      ],
                    ]}
                  />
                </Panel>
              </>
            )}
          </>
        )}
      </ResourceState>
    </div>
  )
}
export default Dashboard
