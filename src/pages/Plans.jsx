import { AdminHeader, AdminTable, Panel, StatusPill } from './AdminParts'
import {
  AppLink,
  ExternalLink,
  Facts,
  RefreshButton,
  ResourceState,
} from './DataParts'
import { Alert } from './FormParts'
import { adminEndpoint, collection } from '../services/admin'
import { useResource } from '../services/useResource'
import { label, money } from '../data/format'

const Plans = () => {
  const resource = useResource(adminEndpoint('plans'))
  const { rows } = collection(resource.data, 'plans')
  return (
    <div className="admin-page">
      <AdminHeader
        title="Plans"
        subtitle="Plan prices, features and availability. Prices are managed by the backend team."
        actions={<RefreshButton resource={resource} />}
      />
      <ResourceState resource={resource}>
        {resource.data?.data?.needsStripeSync && (
          <Alert tone="info">
            Some prices are not linked to Stripe yet. Ask the backend team to
            run the plan sync.
          </Alert>
        )}
        {!rows.length && (
          <Panel title="No plans yet">
            <p className="admin-card-hint">
              Plans will appear here when they are configured.
            </p>
          </Panel>
        )}
        {rows.map((plan) => (
          <Panel
            key={plan.id ?? plan.key}
            title={plan.name}
            hint={plan.description}
            action={
              <div className="admin-inline">
                {plan.isActive === false && (
                  <StatusPill status="switched off" />
                )}
                {plan.isPublic === false && (
                  <StatusPill status="hidden from website" />
                )}
                {plan.customQuote && <StatusPill status="sold by quote" />}
              </div>
            }
          >
            <div className="admin-stack">
              {plan.needsStripeSync && (
                <Alert tone="info">
                  Some prices are not linked to Stripe yet. Ask the backend team
                  to run the plan sync.
                </Alert>
              )}
              <AdminTable
                columns={[
                  {
                    key: 'interval',
                    label: 'Interval',
                    render: (p) => label(p.interval),
                  },
                  {
                    key: 'amount',
                    label: 'Price',
                    render: (p) => (
                      <span className={p.isActive === false ? 'admin-dim' : ''}>
                        {money(p.amount, p.currency)}
                        {p.interval === 'year' && (
                          <p className="admin-cell-sub">
                            {money(p.monthlyEquivalent, p.currency)} / month
                          </p>
                        )}
                      </span>
                    ),
                  },
                  { key: 'trialDays', label: 'Trial days' },
                  {
                    key: 'stripeLinked',
                    label: 'Availability',
                    render: (p) => (
                      <div className="admin-inline">
                        <StatusPill
                          status={
                            p.isActive === false
                              ? 'switched off'
                              : p.stripeLinked
                                ? 'on sale'
                                : 'not on sale yet'
                          }
                        />
                        <ExternalLink to={p.stripeUrl} />
                      </div>
                    ),
                  },
                ]}
                rows={(plan.prices ?? []).map((p, i) => ({
                  ...p,
                  id: p.id ?? `${p.interval}-${i}`,
                }))}
                empty={
                  plan.customQuote
                    ? 'Pricing available by quote.'
                    : 'No prices configured.'
                }
              />
              <div className="admin-grid">
                <div>
                  <h3 className="admin-label">Features</h3>
                  <ul className="admin-feature-list">
                    {(plan.features ?? []).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <Facts
                  items={Object.entries(plan.limits ?? {}).map(
                    ([key, value]) => [
                      label(key),
                      value == null ? 'Unlimited' : value,
                    ],
                  )}
                />
              </div>
              <div className="admin-inline admin-spread">
                <AppLink
                  to={`/subscriptions?planKey=${encodeURIComponent(plan.key ?? plan.planKey)}`}
                >
                  {plan.subscriptionsCount ?? 0} subscriptions
                </AppLink>
                <ExternalLink to={plan.stripeProductUrl}>
                  Product in Stripe
                </ExternalLink>
              </div>
            </div>
          </Panel>
        ))}
      </ResourceState>
    </div>
  )
}
export default Plans
