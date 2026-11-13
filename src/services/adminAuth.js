// Admin auth and account calls (step 1 of the admin API).
import { endSession, refreshSession, request, startSession, updateStaff } from './api'

const post = (path, body) => request(path, { method: 'POST', body })

// On page load: a valid refresh cookie signs the person straight back in.
export const restoreSession = () => refreshSession().catch(() => {})

export const signIn = async (email, password) => {
  const { data } = await post('/v1/admin/auth/login', { email, password })
  startSession(data)
}

export const signOut = async () => {
  try {
    await request('/v1/admin/auth/logout', { method: 'POST' })
  } catch {
    // Always answers 200; if the call itself fails we still clear local state.
  }
  endSession()
}

export const requestPasswordReset = (email) => post('/v1/admin/auth/forgot-password', { email })

export const resetPassword = (token, password) => post('/v1/admin/auth/reset-password', { token, password })

export const acceptInvite = async (token, name, password) => {
  const { data } = await post('/v1/admin/auth/accept-invite', { token, name, password })
  startSession(data)
}

// `/me` may answer with the staff record itself or wrapped as `{ staff }`.
const staffFrom = (data) => data?.staff ?? data

export const fetchProfile = async () => {
  const { data } = await request('/v1/admin/me')
  updateStaff(staffFrom(data))
}

export const renameMe = async (name) => {
  const res = await request('/v1/admin/me', { method: 'PATCH', body: { name } })
  updateStaff(staffFrom(res.data) ?? { name })
  return res
}

// The old access token stops working: the response carries the new session.
export const changePassword = async (currentPassword, newPassword) => {
  const res = await post('/v1/admin/me/change-password', { currentPassword, newPassword })
  startSession(res.data)
  return res
}

export const inviteStaff = (invite) => post('/v1/admin/staff/invites', invite)
