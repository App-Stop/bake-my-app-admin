// Menu gating only — the server checks every call and answers 403 regardless.
export const can = (staff, permission) =>
  !permission || Boolean(staff?.permissions?.includes('*') || staff?.permissions?.includes(permission))

export const ROLES = [
  { key: 'super_admin', label: 'Super admin', description: 'Everything, including staff and plans.' },
  { key: 'sales', label: 'Sales', description: 'Leads and the sales pipeline.' },
  { key: 'onboarding', label: 'Onboarding', description: 'Getting new customers set up.' },
  { key: 'support', label: 'Support', description: 'Helping existing customers.' },
]

export const roleLabel = (key) =>
  ROLES.find((r) => r.key === key)?.label ?? (key ? key.replace(/_/g, ' ') : 'Staff')
