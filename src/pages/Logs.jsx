import { useFilters } from '../services/useLocation'
import { AdminHeader, AdminTable, Panel, StatusPill } from './AdminParts'
import {
  FilterBar,
  FilterSelect,
  Pagination,
  RefreshButton,
  ResourceState,
  AppLink,
  Changes,
} from './DataParts'
import { adminEndpoint, collection } from '../services/admin'
import { useResource } from '../services/useResource'
import { actionLabel, dateTime, label } from '../data/format'
import { TextField } from './FormParts'

const entityLink = (type, id) =>
  (({
    lead: '/leads/',
    subscription: '/subscriptions/',
    staff: '/staff/',
    staff_user: '/staff/',
    staffUser: '/staff/',
  })[type] ?? '') + encodeURIComponent(id)

const auditColumns = [
  {
    key: 'createdAt',
    label: 'When (Karachi)',
    render: (row) => dateTime(row.createdAt),
  },
  {
    key: 'staff',
    label: 'Who',
    render: (row) => row.staff?.name ?? 'Nobody (not signed in)',
  },
  { key: 'action', label: 'What', render: (row) => actionLabel(row.action) },
  {
    key: 'entity',
    label: 'About',
    render: (row) =>
      row.entityId ? (
        <div>
          <span className="admin-cell-sub">{label(row.entityType)}</span>
          <br />
          {[
            'lead',
            'subscription',
            'staff',
            'staff_user',
            'staffUser',
          ].includes(row.entityType) ? (
            <AppLink to={entityLink(row.entityType, row.entityId)}>
              {row.entityId}
            </AppLink>
          ) : (
            row.entityId
          )}
        </div>
      ) : (
        '—'
      ),
  },
  {
    key: 'changes',
    label: 'Details',
    render: (row) => <Changes changes={row.changes} />,
  },
]

const emailColumns = [
  {
    key: 'createdAt',
    label: 'When (Karachi)',
    render: (row) => dateTime(row.createdAt),
  },
  {
    key: 'recipients',
    label: 'To',
    render: (row) => (
      <span title={(row.recipients ?? []).join(', ')}>
        {row.recipients?.[0] ?? '—'}
        {row.recipients?.length > 1 && ` +${row.recipients.length - 1} more`}
      </span>
    ),
  },
  { key: 'subject', label: 'Subject' },
  { key: 'template', label: 'Kind', render: (row) => label(row.template) },
  {
    key: 'status',
    label: 'Result',
    render: (row) => (
      <div>
        <StatusPill status={row.status} />
        {row.status === 'failed' && row.error && (
          <details className="admin-log-error">
            <summary>Error details</summary>
            <p>{row.error}</p>
          </details>
        )}
        {row.status === 'skipped' && (
          <p className="admin-cell-sub">No email provider; nothing was sent.</p>
        )}
      </div>
    ),
  },
]

export const RelatedEmails = ({ leadId, subscriptionId }) => {
  const query = { leadId, subscriptionId, limit: 10 }
  const resource = useResource(adminEndpoint('email-logs', query))
  const { rows } = collection(resource.data, 'emailLogs')
  return (
    <Panel
      title="Emails"
      hint="Recipients, subject and delivery result."
      action={
        <AppLink
          to={`/email-logs?${new URLSearchParams(leadId ? { leadId } : { subscriptionId })}`}
        >
          View all emails
        </AppLink>
      }
    >
      <ResourceState resource={resource}>
        <AdminTable
          columns={emailColumns}
          rows={rows}
          empty="No emails for this record."
        />
      </ResourceState>
    </Panel>
  )
}

const Logs = ({ kind }) => {
  const email = kind === 'email'
  const name = email ? 'email-logs' : 'audit-logs'
  const [filters, setFilters] = useFilters()
  const resource = useResource(adminEndpoint(name, filters))
  const options = useResource(
    adminEndpoint(`${name}/${email ? 'templates' : 'actions'}`),
  )
  const { rows, pagination } = collection(
    resource.data,
    email ? 'emailLogs' : 'auditLogs',
  )
  const choices = collection(options.data, email ? 'templates' : 'actions').rows
  const input = (key, title, hint) => (
    <TextField
      key={key}
      name={key}
      label={title}
      placeholder={hint}
      value={filters[key] ?? ''}
      onChange={(e) => setFilters({ [key]: e.target.value })}
    />
  )
  return (
    <div className="admin-page">
      <AdminHeader
        title={email ? 'Email log' : 'Audit log'}
        subtitle={
          email
            ? 'Track email delivery and investigate failed messages.'
            : 'See who changed what across the admin panel.'
        }
        actions={<RefreshButton resource={resource} />}
      />
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        dates
        search={email}
        placeholder="Subject or recipient"
      >
        {email ? (
          <>
            <FilterSelect
              label="Result"
              name="status"
              multiple
              options={['sent', 'failed', 'skipped']}
              filters={filters}
              setFilters={setFilters}
            />
            <FilterSelect
              label="Kind"
              name="template"
              multiple
              options={choices}
              filters={filters}
              setFilters={setFilters}
            />
            {input('leadId', 'Lead ID')}
            {input('subscriptionId', 'Subscription ID')}
          </>
        ) : (
          <>
            <FilterSelect
              label="Action"
              name="action"
              multiple
              options={choices}
              filters={filters}
              setFilters={setFilters}
            />
            {input('entityType', 'Entity type', 'lead, subscription, staff…')}
            {input('entityId', 'Entity ID')}
            {input('staffUserId', 'Staff ID', 'Staff ID or system')}
          </>
        )}
      </FilterBar>
      {options.error && <ResourceState resource={options} />}
      <ResourceState resource={resource}>
        <AdminTable
          columns={email ? emailColumns : auditColumns}
          rows={rows}
          empty="No log entries match these filters."
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
export const AuditLogs = () => <Logs kind="audit" />
export const EmailLogs = () => <Logs kind="email" />
