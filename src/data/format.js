export const label = (value) =>
  value == null || value === ''
    ? '—'
    : String(value)
        .replace(/[_.]/g, ' ')
        .replace(/^\w/, (s) => s.toUpperCase())
export const person = (value) =>
  value?.name ||
  value?.email ||
  (typeof value === 'string' ? value : 'Unassigned')
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'
export const dateOnly = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
      })
    : '—'
export const money = (amount, currency = 'usd') =>
  amount == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100)
export const textValue = (value) =>
  value == null
    ? '—'
    : typeof value === 'object'
      ? (value.name ?? JSON.stringify(value))
      : String(value)
export const localDateTime = (value) =>
  value
    ? new Date(new Date(value).getTime() + 5 * 3600000)
        .toISOString()
        .slice(0, 16)
    : ''
export const karachiToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'demo_scheduled',
  'quote_sent',
  'won',
  'lost',
]
export const SOURCES = [
  'contact_form',
  'promo_popup',
  'pricing',
  'checkout',
  'quote',
  'shop_setup',
]
export const BILLING_STATUSES = [
  'trial',
  'active',
  'past_due',
  'suspended',
  'paused',
  'cancelled',
  'incomplete',
]
export const ONBOARDING_STATUSES = ['pending', 'in_progress', 'live']
export const PLAN_KEYS = ['startup', 'growth', 'business_suite']

const ACTIONS = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed to sign in',
  'auth.login_locked': 'Account locked after failed sign-ins',
  'auth.logout': 'Signed out',
  'auth.refresh_reuse': 'Session cookie reuse detected',
  'auth.password_changed': 'Changed password',
  'auth.password_reset_requested': 'Requested a password reset',
  'auth.password_reset': 'Reset password',
  'staff.created': 'Created a staff account',
  'staff.invited': 'Invited a staff member',
  'staff.invite_accepted': 'Accepted an invitation',
  'staff.invite_revoked': 'Cancelled an invitation',
  'staff.updated': 'Changed a staff member',
  'staff.sessions_revoked': 'Signed out all devices',
  'staff.unlocked': 'Unlocked a staff account',
  'staff.profile_updated': 'Updated their profile',
  'lead.updated': 'Changed a lead',
  'lead.note_added': 'Added a lead note',
  'lead.deleted': 'Deleted a lead',
  'leads.exported': 'Exported leads',
  'subscription.onboarding_updated': 'Updated onboarding',
}
export const actionLabel = (action) => ACTIONS[action] ?? action ?? '—'
