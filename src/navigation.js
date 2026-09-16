// Path router for the admin app. Unknown paths fall back to the dashboard.
export const adminPaths = { dashboard: '/', bakeries: '/bakeries' }

const PAGES = Object.fromEntries(Object.entries(adminPaths).map(([page, path]) => [path, page]))

export const currentAdminPage = () =>
  PAGES[window.location.pathname.replace(/(.)\/+$/, '$1')] ?? 'dashboard'

export const navigateAdmin = (path) => {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// onClick for in-app `<a>` links: keeps modifier-clicks (new tab) working.
export const adminLinkClick = (path) => (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  navigateAdmin(path)
}
