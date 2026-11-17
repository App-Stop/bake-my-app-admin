// Path router for the admin app. Unknown paths fall back to the dashboard.
export const adminPaths = {
  dashboard: '/',
  bakeries: '/bakeries',
  leads: '/leads',
  subscriptions: '/subscriptions',
  plans: '/plans',
  auditLogs: '/audit-logs',
  emailLogs: '/email-logs',
  staff: '/staff',
  account: '/account',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  acceptInvite: '/accept-invite',
}

// Pages reachable without a session (emailed links land on the last two).
export const PUBLIC_PAGES = new Set([
  'login',
  'forgotPassword',
  'resetPassword',
  'acceptInvite',
])

const PAGES = Object.fromEntries(
  Object.entries(adminPaths).map(([page, path]) => [path, page]),
)

export const currentAdminPage = () => {
  const path = window.location.pathname.replace(/(.)\/+$/, '$1')
  return PAGES[path] ?? PAGES[`/${path.split('/')[1]}`] ?? 'dashboard'
}

export const detailId = () =>
  decodeURIComponent(window.location.pathname.split('/')[2] ?? '')

export const queryParam = (name) =>
  new URLSearchParams(window.location.search).get(name) ?? ''

export const navigateAdmin = (path, { replace = false } = {}) => {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// onClick for in-app `<a>` links: keeps modifier-clicks (new tab) working.
export const adminLinkClick = (path) => (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
    return
  event.preventDefault()
  navigateAdmin(path)
}
