import { useFilters } from '../services/useLocation'
import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  AdminHeader,
  AdminTable,
  NameCell,
  Panel,
  StatusPill,
} from './AdminParts'
import { Alert, Button } from './FormParts'
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
  SavedViews,
  TextAreaField,
} from './DataParts'
import { RelatedEmails } from './Logs'
import { detailId, navigateAdmin } from '../navigation'
import {
  adminEndpoint,
  collection,
  deleteAdmin,
  exportLeads,
  getAdmin,
  patchAdmin,
  postAdmin,
} from '../services/admin'
import { useResource } from '../services/useResource'
import { useSession, useSubmit } from '../services/hooks'
import { can } from '../permissions'
import {
  dateTime,
  label,
  LEAD_STATUSES,
  localDateTime,
  person,
  PLAN_KEYS,
  SOURCES,
} from '../data/format'

const columns = [
  {
    key: 'name',
    sortable: true,
    label: 'Contact',
    render: (row) => (
      <AppLink to={`/leads/${row.id}`}>
        <NameCell name={row.name || row.email} sub={row.email} />
      </AppLink>
    ),
  },
  {
    key: 'businessName',
    label: 'Business',
    render: (row) => row.businessName || '—',
  },
  { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <div className="admin-inline">
        <StatusPill status={row.status} />
        {row.hasSubscription && <StatusPill status="subscribed" />}
        {row.isSpam && <StatusPill status="spam" />}
      </div>
    ),
  },
  {
    key: 'lastSource',
    label: 'Source',
    render: (row) => label(row.lastSource),
  },
  {
    key: 'assignedTo',
    label: 'Assigned to',
    render: (row) => person(row.assignedTo),
  },
  {
    key: 'nextFollowUpAt',
    sortable: true,
    label: 'Follow-up (Karachi)',
    render: (row) => dateTime(row.nextFollowUpAt),
  },
  {
    key: 'lastSubmissionAt',
    sortable: true,
    label: 'Last activity (Karachi)',
    render: (row) => dateTime(row.lastSubmissionAt),
  },
  {
    key: 'planKey',
    label: 'Plan',
    render: (row) => (
      <>
        {label(row.planKey)}
        <p className="admin-cell-sub">{label(row.billingInterval)}</p>
      </>
    ),
  },
  { key: 'submissionsCount', label: 'Submissions' },
]
const views = [
  ['All leads', {}],
  ['All new', { status: 'new' }],
  ['My leads', { assignedTo: 'me' }],
  ['Unassigned', { assignedTo: 'unassigned' }],
  ['Follow-ups due', { followUp: 'due' }],
  ['Spam', { spam: 'only' }],
]

const LeadsList = () => {
  const { staff } = useSession()
  const [filters, setFilters] = useFilters()
  const resource = useResource(adminEndpoint('leads', filters))
  const assignees = useResource(adminEndpoint('leads/assignees'))
  const { rows, pagination } = collection(resource.data, 'leads')
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
        title="Leads"
        subtitle="Every enquiry, follow-up and conversation in one place."
        actions={
          <>
            <RefreshButton resource={resource} />
            {can(staff, 'leads:export') && (
              <ActionButton action={() => exportLeads(filters)}>
                <Download size={16} /> Export CSV
              </ActionButton>
            )}
          </>
        }
      />
      <SavedViews views={views} filters={filters} setFilters={setFilters} />
      <FilterBar
        errors={resource.error?.fields}
        filters={filters}
        setFilters={setFilters}
        dates
        placeholder="Name, email, phone or business"
      >
        {filter('status', 'Status', LEAD_STATUSES, true)}
        {filter('source', 'Source', SOURCES)}
        {filter('assignedTo', 'Assigned to', [
          { key: 'me', name: 'My leads' },
          { key: 'unassigned', name: 'Unassigned' },
          ...people,
        ])}
        {filter('planKey', 'Plan', PLAN_KEYS)}
        {filter('spam', 'Spam', [
          { key: 'only', name: 'Spam only' },
          { key: 'include', name: 'Include spam' },
        ])}
        {filter('followUp', 'Follow-up', [{ key: 'due', name: 'Due now' }])}
        {filter(
          'sort',
          'Sort by',
          ['lastSubmissionAt', 'createdAt', 'name', 'nextFollowUpAt'].map(
            (key) => ({
              key,
              name: {
                lastSubmissionAt: 'Last activity',
                createdAt: 'First contact',
                name: 'Name',
                nextFollowUpAt: 'Next follow-up',
              }[key],
            }),
          ),
        )}
        {filter('order', 'Order', [
          { key: 'desc', name: 'Descending' },
          { key: 'asc', name: 'Ascending' },
        ])}
      </FilterBar>
      {assignees.error && <ResourceState resource={assignees} />}
      <ResourceState resource={resource}>
        <AdminTable
          sort={filters.sort || 'lastSubmissionAt'}
          order={filters.order || 'desc'}
          onSort={(sort) =>
            setFilters({
              sort,
              order:
                (filters.sort || 'lastSubmissionAt') === sort &&
                (filters.order || 'desc') === 'desc'
                  ? 'asc'
                  : 'desc',
            })
          }
          columns={columns}
          rows={rows}
          empty="No leads match these filters."
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

const NoteForm = ({ id, onSaved }) => {
  const [body, setBody] = useState('')
  const submit = useSubmit(['body'])
  return (
    <form
      className="admin-form"
      onSubmit={async (e) => {
        e.preventDefault()
        const { ok } = await submit.run(async () => {
          await postAdmin(`leads/${id}/notes`, { body: body.trim() })
          await onSaved()
        })
        if (ok) setBody('')
      }}
    >
      <TextAreaField
        label="Add internal note"
        placeholder="Private to the team. Notes cannot be edited or deleted."
        value={body}
        maxLength={4000}
        required
        onChange={(e) => {
          setBody(e.target.value)
          submit.clearField('body')
        }}
        error={submit.fields.body}
      />
      {submit.error && <Alert>{submit.error}</Alert>}
      <div className="admin-form-actions">
        <Button type="submit" loading={submit.loading} disabled={!body.trim()}>
          Add note
        </Button>
      </div>
    </form>
  )
}

const timelineLabel = (item) => {
  const d = item.data ?? {}
  return (
    {
      submission_received: `Sent ${label(d.source).toLowerCase()}`,
      status_changed: `Status: ${label(d.from)} → ${label(d.to)}`,
      assigned: `Assigned to ${person(d.to)}`,
      follow_up_set: d.to
        ? `Follow-up set for ${dateTime(d.to)}`
        : 'Follow-up cleared',
      spam_changed: d.isSpam ? 'Marked as spam' : 'Marked as not spam',
      details_updated: `Updated ${
        Object.keys(d.changes ?? {})
          .map(label)
          .join(', ') || 'contact details'
      }`,
      note_added: 'Added a note',
    }[item.type] ?? label(item.type)
  )
}

const LeadDetail = ({ id }) => {
  const { staff } = useSession()
  const resource = useResource(adminEndpoint(`leads/${id}`))
  const assignees = useResource(
    can(staff, 'leads:update') ? adminEndpoint('leads/assignees') : null,
  )
  const lead = resource.data?.data
  const replace = (response) => resource.replace(response)
  const people = collection(assignees.data, 'assignees').rows.map((s) => ({
    key: s.id,
    name: s.name,
  }))
  const initial = lead && {
    name: lead.name ?? '',
    businessName: lead.businessName ?? '',
    phone: lead.phone ?? '',
    status: lead.status,
    assignedTo:
      lead.assignedTo?.id ??
      (typeof lead.assignedTo === 'string' ? lead.assignedTo : ''),
    nextFollowUpAt: localDateTime(lead.nextFollowUpAt),
  }
  return (
    <div className="admin-page">
      <AppLink to="/leads">← All leads</AppLink>
      <ResourceState resource={resource}>
        {lead && (
          <>
            <AdminHeader
              title={lead.name || lead.email}
              subtitle={lead.businessName || lead.email}
              actions={
                <>
                  <RefreshButton resource={resource} />
                  {can(staff, 'leads:update') && (
                    <ActionButton
                      action={() =>
                        patchAdmin(`leads/${id}`, { isSpam: !lead.isSpam })
                      }
                      onDone={replace}
                    >
                      {lead.isSpam ? 'Not spam' : 'Mark as spam'}
                    </ActionButton>
                  )}
                  {can(staff, 'leads:delete') && (
                    <ActionButton
                      variant="danger"
                      confirm="Permanently delete this lead, their submissions, notes and activity? This privacy deletion cannot be undone."
                      action={() => deleteAdmin(`leads/${id}`)}
                      onDone={() => navigateAdmin('/leads')}
                    >
                      Delete lead
                    </ActionButton>
                  )}
                </>
              }
            />
            <div className="admin-split">
              <div className="admin-stack">
                <Panel title="Contact details">
                  <Facts
                    items={[
                      [
                        'Email',
                        <a className="admin-link" href={`mailto:${lead.email}`}>
                          {lead.email}
                        </a>,
                      ],
                      ['Phone', lead.phone],
                      ['Business', lead.businessName],
                      ['Status', <StatusPill status={lead.status} />],
                      ['Assigned to', person(lead.assignedTo)],
                      ['Next follow-up', dateTime(lead.nextFollowUpAt)],
                      ['Spam', lead.isSpam ? 'Yes' : 'No'],
                    ]}
                  />
                </Panel>
                <Panel title="Messages" hint="The forms this person submitted.">
                  {lead.submissions?.length ? (
                    <ul className="admin-timeline">
                      {lead.submissions.map((s, i) => (
                        <li key={s.id ?? i}>
                          <div className="admin-inline admin-spread">
                            <strong>
                              {label(s.source)} · {label(s.topic)}
                            </strong>
                            <time>{dateTime(s.createdAt)}</time>
                          </div>
                          <p className="admin-prose">
                            {s.message || 'No message supplied.'}
                          </p>
                          <p className="admin-cell-sub">
                            {s.planKey &&
                              `Plan: ${label(s.planKey)} · ${label(s.billingInterval)}`}
                            {s.branchCount != null &&
                              ` · ${s.branchCount} branches`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-card-hint">No submissions yet.</p>
                  )}
                </Panel>
                <Panel title="Internal notes">
                  <div className="admin-stack">
                    <ul className="admin-timeline">
                      {(lead.notes ?? []).map((note, i) => (
                        <li key={note.id ?? i}>
                          <p className="admin-prose">{note.body}</p>
                          <p className="admin-cell-sub">
                            {note.staff?.name ?? note.author?.name ?? 'Staff'} ·{' '}
                            {dateTime(note.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {can(staff, 'leads:update') && (
                      <NoteForm
                        id={id}
                        onSaved={async () =>
                          replace(await getAdmin(`leads/${id}`))
                        }
                      />
                    )}
                  </div>
                </Panel>
                <Panel title="Timeline">
                  <ActivityList
                    items={lead.activities}
                    render={timelineLabel}
                  />
                </Panel>
                <AdminTable
                  title="Subscriptions"
                  rows={lead.subscriptions ?? []}
                  columns={[
                    {
                      key: 'planKey',
                      label: 'Plan',
                      render: (s) => (
                        <AppLink to={`/subscriptions/${s.id}`}>
                          {label(s.planKey)}
                        </AppLink>
                      ),
                    },
                    {
                      key: 'status',
                      label: 'Billing',
                      render: (s) => <StatusPill status={s.status} />,
                    },
                    {
                      key: 'onboardingStatus',
                      label: 'Onboarding',
                      render: (s) => <StatusPill status={s.onboardingStatus} />,
                    },
                    {
                      key: 'trialEndsAt',
                      label: 'Trial ends',
                      render: (s) => dateTime(s.trialEndsAt),
                    },
                  ]}
                />
                {can(staff, 'email_logs:view') && <RelatedEmails leadId={id} />}
              </div>
              {can(staff, 'leads:update') && (
                <Panel title="Manage lead">
                  <ResourceState resource={assignees}>
                    <EditForm
                      key={JSON.stringify(initial)}
                      initial={initial}
                      definitions={[
                        { key: 'name', title: 'Name' },
                        { key: 'businessName', title: 'Business' },
                        { key: 'phone', title: 'Phone', type: 'tel' },
                        {
                          key: 'status',
                          title: 'Status',
                          options: LEAD_STATUSES,
                        },
                        {
                          key: 'assignedTo',
                          title: 'Assigned to',
                          options: [{ key: '', name: 'Unassigned' }, ...people],
                        },
                        {
                          key: 'nextFollowUpAt',
                          title: 'Follow-up (Karachi, UTC+5)',
                          type: 'datetime-local',
                        },
                      ]}
                      onSave={(changes) =>
                        patchAdmin(
                          `leads/${id}`,
                          Object.fromEntries(
                            Object.entries(changes).map(([key, value]) => [
                              key,
                              value === ''
                                ? null
                                : key === 'nextFollowUpAt'
                                  ? `${value}:00+05:00`
                                  : value,
                            ]),
                          ),
                        )
                      }
                      onSaved={replace}
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

const Leads = () => {
  const id = detailId()
  return id ? <LeadDetail key={id} id={id} /> : <LeadsList />
}
export default Leads
