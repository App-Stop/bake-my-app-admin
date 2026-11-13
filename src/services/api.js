// Admin API client. See the admin integration guide:
// - the access token lives in memory only (never localStorage);
// - the refresh token is an HttpOnly cookie, so every call sends credentials;
// - a 401 triggers one refresh and one retry; refreshes never overlap, because
//   reusing a rotated cookie revokes the session on every device.

export const API_URL = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3060').replace(/\/+$/, '')

const AUTH_PREFIX = '/v1/admin/auth/'

const FALLBACK_MESSAGES = {
  0: "Can't reach the server. Check your connection and try again.",
  400: 'This link is invalid or has expired.',
  401: 'Your session has ended. Sign in again.',
  403: 'You do not have access to this.',
  409: 'That email already has an account.',
  422: 'Some fields need attention.',
  429: 'Too many attempts. Try again later.',
  503: 'The email could not be sent. Try again.',
}

export class ApiError extends Error {
  constructor(status, message, fields = []) {
    super(message || FALLBACK_MESSAGES[status] || 'Something went wrong. Try again.')
    this.status = status
    // Server paths may be nested ("body.password"); the last segment is the field.
    this.fields = (Array.isArray(fields) ? fields : []).map((f) => ({
      path: String(Array.isArray(f.path) ? f.path.at(-1) : f.path ?? '').split('.').pop(),
      message: f.message,
    }))
  }
}

/* ---------- Session store (read in React through useSession) ---------- */

let accessToken = null
let state = { status: 'loading', staff: null, reason: null }
const listeners = new Set()

const setState = (next) => {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

export const subscribeSession = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSessionState = () => state

export const startSession = (data) => {
  if (data?.accessToken) accessToken = data.accessToken
  setState({ status: 'signedIn', staff: data?.staff ?? state.staff, reason: null })
}

// `reason` lets the sign-in screen explain why the person landed there.
export const endSession = (reason = null) => {
  accessToken = null
  setState({ status: 'signedOut', staff: null, reason })
}

export const updateStaff = (staff) => {
  if (staff) setState({ staff: { ...state.staff, ...staff } })
}

/* ---------- Requests ---------- */

const send = async (path, { method = 'GET', body } = {}) => {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0)
  }
}

const readEnvelope = async (res) => {
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, payload?.message, payload?.error)
  return payload ?? {}
}

let refreshing = null

// One refresh in flight at a time: concurrent callers share the same promise.
export const refreshSession = () => {
  refreshing ??= send(`${AUTH_PREFIX}refresh`, { method: 'POST' })
    .then(readEnvelope)
    .then(({ data }) => startSession(data))
    .catch((err) => {
      // A dropped connection mid-session is not a sign-out; anything else is.
      if (err.status !== 0 || state.status !== 'signedIn') {
        endSession(state.status === 'signedIn' ? 'expired' : null)
      }
      throw err
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

// Returns the `{ success, message, data }` envelope, or throws ApiError.
export const request = async (path, options = {}) => {
  let res = await send(path, options)
  if (res.status === 401 && !path.startsWith(AUTH_PREFIX)) {
    await refreshSession() // throws when signed out; the app then shows sign-in
    res = await send(path, options)
  }
  return readEnvelope(res)
}
