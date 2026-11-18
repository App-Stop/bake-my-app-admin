import { useContext, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw } from 'lucide-react'
import { adminLinkClick } from '../navigation'
import { actionLabel, dateTime, label, textValue } from '../data/format'
import { useSubmit } from '../services/hooks'
import {
  Alert,
  Button,
  Field,
  SelectField,
  Spinner,
  TextField,
} from './FormParts'
import { FieldErrors } from './fieldErrors'

export const AppLink = ({ to, children, className = 'admin-link' }) => (
  <a href={to} className={className} onClick={adminLinkClick(to)}>
    {children}
  </a>
)
export const ExternalLink = ({ to, children = 'Open in Stripe' }) =>
  to ? (
    <a
      href={to}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-link"
    >
      {children} ↗
    </a>
  ) : null

export const ResourceState = ({ resource, children }) =>
  resource.loading ? (
    <div className="admin-loading">
      <Spinner label="Loading records" />
      <span>Loading…</span>
    </div>
  ) : resource.error ? (
    <Alert
      action={
        <Button variant="secondary" onClick={resource.reload}>
          Try again
        </Button>
      }
    >
      {resource.error.message}
      {resource.error.fields?.map((field) => (
        <span className="block" key={field.path}>
          {label(field.path)}: {field.message}
        </span>
      ))}
    </Alert>
  ) : (
    children
  )

export const RefreshButton = ({ resource }) => (
  <Button
    variant="secondary"
    onClick={resource.reload}
    disabled={resource.loading}
  >
    <RefreshCw size={16} /> Refresh
  </Button>
)

const SearchInput = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
  }, [draft, value, onChange])
  return (
    <TextField
      name="q"
      type="search"
      label="Search"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  )
}

export const FilterSelect = ({
  label: title,
  name,
  filters,
  setFilters,
  options,
  multiple = false,
}) => {
  const value = filters[name] ?? ''
  const errors = useContext(FieldErrors)
  const emptyLabel =
    {
      status: 'All statuses',
      source: 'All sources',
      assignedTo: 'Anyone',
      planKey: 'All plans',
      spam: 'Hide spam',
      followUp: 'Any follow-up',
      sort: 'Default sort',
      order: 'Descending (default)',
      onboardingStatus: 'All states',
      billingInterval: 'Any interval',
      cancelling: 'All subscriptions',
      role: 'All roles',
      action: 'All actions',
      template: 'All kinds',
    }[name] ?? 'All'
  if (multiple)
    return (
      <div className="admin-field">
        <span className="admin-label">{title}</span>
        <details className="admin-multi">
          <summary>
            {value ? value.split(',').map(label).join(', ') : emptyLabel}
          </summary>
          <div className="admin-multi-options">
            {options.map((option) => {
              const key = option.key ?? option
              const checked = value.split(',').includes(key)
              return (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setFilters({
                        [name]: (checked
                          ? value.split(',').filter((v) => v !== key)
                          : [...value.split(',').filter(Boolean), key]
                        ).join(','),
                      })
                    }
                  />
                  {option.name ?? label(key)}
                </label>
              )
            })}
          </div>
        </details>
        {errors[name] && (
          <p className="admin-field-error" role="alert">
            {errors[name]}
          </p>
        )}
      </div>
    )
  return (
    <SelectField
      name={name}
      label={title}
      value={value}
      onChange={(e) => setFilters({ [name]: e.target.value })}
    >
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.key ?? option} value={option.key ?? option}>
          {option.name ?? label(option)}
        </option>
      ))}
    </SelectField>
  )
}

export const FilterBar = ({
  filters,
  setFilters,
  placeholder,
  children,
  dates = false,
  search = true,
  errors = [],
}) => (
  <FieldErrors.Provider
    value={Object.fromEntries(
      errors.map((field) => [field.path, field.message]),
    )}
  >
    <section className="admin-card admin-filter-panel">
      <div className="admin-filter-grid">
        {search && (
          <SearchInput
            key={filters.q ?? ''}
            value={filters.q ?? ''}
            onChange={(q) => setFilters({ q })}
            placeholder={placeholder}
          />
        )}
        {children}
        {dates && (
          <>
            <TextField
              name="from"
              label="From (Start Date)"
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setFilters({ from: e.target.value })}
            />
            <TextField
              name="to"
              label="To (End Date)"
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters({ to: e.target.value })}
            />
          </>
        )}
        <div className="admin-filter-reset">
          <Button
            variant="secondary"
            onClick={() => setFilters({}, { reset: true })}
          >
            Clear filters
          </Button>
        </div>
      </div>
    </section>
  </FieldErrors.Provider>
)

export const SavedViews = ({ views, filters, setFilters }) => (
  <div className="admin-filters" role="group" aria-label="Quick views">
    {views.map(([name, query]) => (
      <button
        key={name}
        className="admin-filter"
        aria-pressed={
          Object.entries(query).every(([k, v]) => filters[k] === v) &&
          (Object.keys(query).length > 0 ||
            !Object.keys(filters).some((k) => k !== 'page' && k !== 'limit'))
        }
        onClick={() => setFilters(query, { reset: true })}
      >
        {name}
      </button>
    ))}
  </div>
)

export const Pagination = ({ pagination, filters, setFilters }) => {
  if (!pagination) return null
  const page = pagination.currentPage ?? Number(filters.page || 1)
  const pages = pagination.totalPages ?? 1
  return (
    <div className="admin-pagination">
      <span>
        {pagination.totalItems ?? 0} records · Page {page} of{' '}
        {Math.max(1, pages)}
      </span>
      <div className="admin-inline">
        <SelectField
          label="Per page"
          value={filters.limit ?? pagination.itemsPerPage ?? 10}
          onChange={(e) => setFilters({ limit: e.target.value })}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setFilters({ page: page - 1 })}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => setFilters({ page: page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export const TextAreaField = ({ label: title, error, hint, ...props }) => {
  const id = useId()
  return (
    <Field id={id} label={title} error={error} hint={hint}>
      <textarea
        id={id}
        className="admin-input admin-textarea"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Field>
  )
}

export const Facts = ({ items }) => (
  <dl className="admin-facts">
    {items.map(([key, value]) => (
      <div key={key}>
        <dt>{key}</dt>
        <dd>{value ?? '—'}</dd>
      </div>
    ))}
  </dl>
)

export const Changes = ({ changes }) => (
  <dl className="admin-changes">
    {Object.entries(changes ?? {}).map(([key, value]) => (
      <div key={key}>
        <dt>{label(key)}</dt>
        <dd>
          {value &&
          typeof value === 'object' &&
          ('from' in value || 'to' in value) ? (
            <>
              {textValue(value.from)} → {textValue(value.to)}
            </>
          ) : (
            textValue(value)
          )}
        </dd>
      </div>
    ))}
  </dl>
)

export const ActivityList = ({
  items,
  render,
  who = (item) => item.staff?.name ?? 'System',
}) =>
  items?.length ? (
    <ul className="admin-timeline">
      {items.map((item, i) => (
        <li key={item.id ?? i}>
          <div className="admin-inline admin-spread">
            <strong>
              {render ? render(item) : actionLabel(item.action ?? item.type)}
            </strong>
            <time>{dateTime(item.createdAt)}</time>
          </div>
          <p className="admin-cell-sub">{who(item)}</p>
          <Changes changes={item.changes} />
        </li>
      ))}
    </ul>
  ) : (
    <p className="admin-card-hint">No activity yet.</p>
  )

export const EditForm = ({
  initial,
  definitions,
  onSave,
  onSaved,
  confirmChange,
  submitLabel = 'Save changes',
}) => {
  const [form, setForm] = useState(initial)
  const [confirmation, setConfirmation] = useState(null)
  const [saved, setSaved] = useState(false)
  const submit = useSubmit(definitions.map((field) => field.key))
  const changes = Object.fromEntries(
    Object.entries(form).filter(([key, value]) => value !== initial[key]),
  )
  const save = async () => {
    setSaved(false)
    const { ok, result } = await submit.run(() => onSave(changes))
    if (ok) {
      setSaved(true)
      onSaved?.(result)
    }
    setConfirmation(null)
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault()
        const warning = confirmChange?.(changes)
        if (warning) setConfirmation(warning)
        else save()
      }}
    >
      {definitions.map(
        ({
          key,
          title,
          options,
          type,
          hint,
          disabled,
          required,
          maxLength,
        }) => {
          const props = {
            label: title,
            value: form[key] ?? '',
            error: submit.fields[key],
            hint,
            disabled: submit.loading || disabled,
            required,
            onChange: (e) => {
              setForm({ ...form, [key]: e.target.value })
              submit.clearField(key)
              setSaved(false)
            },
          }
          return options ? (
            <SelectField key={key} {...props}>
              {options.map((o) => (
                <option key={o.key ?? o} value={o.key ?? o}>
                  {o.name ?? label(o)}
                </option>
              ))}
            </SelectField>
          ) : type === 'textarea' ? (
            <TextAreaField key={key} {...props} maxLength={maxLength ?? 4000} />
          ) : (
            <TextField
              key={key}
              {...props}
              type={type ?? 'text'}
              maxLength={maxLength}
            />
          )
        },
      )}
      {submit.error && <Alert>{submit.error}</Alert>}
      {saved && <Alert tone="success">Changes saved.</Alert>}
      <div className="admin-form-actions">
        <Button
          type="submit"
          loading={submit.loading}
          disabled={!Object.keys(changes).length}
        >
          {submitLabel}
        </Button>
      </div>
      {confirmation && (
        <ConfirmDialog
          message={confirmation}
          onCancel={() => setConfirmation(null)}
          onConfirm={save}
          loading={submit.loading}
        />
      )}
    </form>
  )
}

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]'

// Modal shell: traps focus, closes on Escape (unless busy) and hides the page
// from assistive tech while open. Callers supply the body and the actions.
export const Dialog = ({ title, description, onClose, busy, children }) => {
  const id = useId()
  useEffect(() => {
    const previous = document.activeElement
    const root = document.getElementById('root')
    const wasInert = root?.inert
    if (root) root.inert = true
    document.getElementById(id)?.querySelector(FOCUSABLE)?.focus()
    return () => {
      if (root) root.inert = wasInert
      previous?.focus()
    }
  }, [id])
  useEffect(() => {
    const keydown = (e) => {
      if (e.key === 'Escape' && !busy) onClose()
      if (e.key === 'Tab') {
        const items = document.getElementById(id)?.querySelectorAll(FOCUSABLE)
        if (!items?.length) {
          e.preventDefault()
          return
        }
        const first = items[0],
          last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [id, busy, onClose])
  return createPortal(
    <div className="admin-dialog-backdrop">
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-message` : undefined}
        className="admin-dialog"
      >
        <h2 id={`${id}-title`} className="admin-card-title">
          {title}
        </h2>
        {description && <p id={`${id}-message`}>{description}</p>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export const ConfirmDialog = ({
  message,
  onCancel,
  onConfirm,
  loading,
  error,
  title = 'Confirm change',
  confirmLabel = 'Confirm',
  variant = 'primary',
}) => (
  <Dialog
    title={title}
    description={message}
    onClose={onCancel}
    busy={loading}
  >
    {error && <Alert>{error}</Alert>}
    <div className="admin-form-actions">
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
      <Button variant={variant} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </div>
  </Dialog>
)

export const ActionButton = ({
  action,
  confirm,
  children,
  onDone,
  variant = 'secondary',
}) => {
  const [open, setOpen] = useState(false)
  const submit = useSubmit()
  const run = async () => {
    const { ok, result } = await submit.run(action)
    if (ok) {
      setOpen(false)
      onDone?.(result)
    }
  }
  return (
    <div className="admin-action">
      <Button
        variant={variant}
        loading={submit.loading}
        onClick={() => (confirm ? setOpen(true) : run())}
      >
        {children}
      </Button>
      {submit.error && !open && <Alert>{submit.error}</Alert>}
      {open && (
        <ConfirmDialog
          message={confirm}
          onCancel={() => setOpen(false)}
          onConfirm={run}
          loading={submit.loading}
          error={submit.error}
        />
      )}
    </div>
  )
}
