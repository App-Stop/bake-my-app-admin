import { request, requestRaw } from './api'

export const adminEndpoint = (resource, query = {}) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== '' && value !== null && value !== undefined)
      params.set(key, value)
  }
  return `/v1/admin/${resource}${params.size ? `?${params}` : ''}`
}

export const getAdmin = (resource, query) =>
  request(adminEndpoint(resource, query))
export const patchAdmin = (resource, body) =>
  request(adminEndpoint(resource), { method: 'PATCH', body })
export const postAdmin = (resource, body) =>
  request(adminEndpoint(resource), { method: 'POST', body })
export const deleteAdmin = (resource) =>
  request(adminEndpoint(resource), { method: 'DELETE' })

// Collections may carry pagination beside data or beside the named array.
export const collection = (envelope, key) => {
  const data = envelope?.data
  const rows = Array.isArray(data)
    ? data
    : (data?.[key] ?? data?.items ?? data?.logs ?? [])
  return { rows, pagination: envelope?.pagination ?? data?.pagination }
}

export const exportLeads = async (filters) => {
  const query = { ...filters }
  delete query.page
  delete query.limit
  const res = await requestRaw(adminEndpoint('leads/export', query))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    /filename="([^"]+)"/i.exec(res.headers.get('Content-Disposition'))?.[1] ??
    'leads.csv'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
