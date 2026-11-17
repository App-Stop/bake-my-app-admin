import { useSyncExternalStore } from 'react'
import { navigateAdmin } from '../navigation'

const subscribeLocation = (fn) => {
  window.addEventListener('popstate', fn)
  return () => window.removeEventListener('popstate', fn)
}

export const useLocation = () =>
  useSyncExternalStore(
    subscribeLocation,
    () => window.location.pathname + window.location.search,
  )

export const useFilters = () => {
  useLocation()
  const filters = Object.fromEntries(
    new URLSearchParams(window.location.search),
  )
  const setFilters = (changes, { reset = false } = {}) => {
    const params = new URLSearchParams(reset ? '' : window.location.search)
    params.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value == null) params.delete(key)
      else params.set(key, value)
    }
    navigateAdmin(
      `${window.location.pathname}${params.size ? `?${params}` : ''}`,
    )
  }
  return [filters, setFilters]
}
