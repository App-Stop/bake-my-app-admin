import { useId, useState } from 'react'
import { Check, CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle } from 'lucide-react'

export const Field = ({ label, error, hint, children, id }) => (
  <div className="admin-field">
    <label className="admin-label" htmlFor={id}>{label}</label>
    {children}
    {error ? (
      <p className="admin-field-error" id={`${id}-error`} role="alert">{error}</p>
    ) : hint ? (
      <p className="admin-field-hint">{hint}</p>
    ) : null}
  </div>
)

// Text input wired to its Field: pass `label`, `error`, plus any input props.
export const TextField = ({ label, error, hint, className = '', ...props }) => {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <input
        id={id}
        className={`admin-input ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Field>
  )
}

export const PasswordField = ({ label, error, hint, ...props }) => {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <div className="admin-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="admin-input admin-input--icon"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          className="admin-input-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon strokeWidth={1.5} />
        </button>
      </div>
    </Field>
  )
}

export const SelectField = ({ label, error, hint, children, ...props }) => {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <select id={id} className="admin-input admin-select" aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
    </Field>
  )
}

export const Button = ({ variant = 'primary', loading = false, children, className = '', disabled, ...props }) => (
  <button
    type="button"
    className={`admin-btn admin-btn--${variant} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <LoaderCircle className="admin-spin" strokeWidth={2} aria-hidden="true" />}
    {children}
  </button>
)

const ALERT_ICONS = { error: CircleAlert, success: CircleCheck, info: Info }

export const Alert = ({ tone = 'error', children, action }) => {
  const Icon = ALERT_ICONS[tone]
  return (
    <div className={`admin-alert admin-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon strokeWidth={2} aria-hidden="true" />
      <div className="admin-alert-body">
        <p>{children}</p>
        {action}
      </div>
    </div>
  )
}

// Hints only — the server enforces the rules and returns the exact reason.
export const PasswordRules = ({ password, email }) => {
  const local = email?.split('@')[0]?.toLowerCase()
  const rules = [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'Not a common password' },
    {
      label: local ? `Doesn't contain “${local}”` : 'Doesn’t contain your email name',
      met: local && password ? !password.toLowerCase().includes(local) : undefined,
    },
  ]
  return (
    <ul className="admin-rules" aria-label="Password rules">
      {rules.map((rule) => (
        <li key={rule.label} className={rule.met && password ? 'is-met' : ''}>
          <Check strokeWidth={2.5} aria-hidden="true" />
          {rule.label}
        </li>
      ))}
    </ul>
  )
}

export const Spinner = ({ label = 'Loading' }) => (
  <span className="admin-spinner" role="status">
    <LoaderCircle className="admin-spin" strokeWidth={2} aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </span>
)
