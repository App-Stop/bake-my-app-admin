import { useCallback, useState, useSyncExternalStore } from 'react'
import { getSessionState, subscribeSession } from './api'

export const useSession = () => useSyncExternalStore(subscribeSession, getSessionState)

const IDLE = { loading: false, error: null, status: null, fields: {} }

// Runs a form submission and splits errors into a general message plus field
// messages. `fieldNames` are the fields the form shows; a 422 error on any
// other path is folded into the general message so it is never lost.
export const useSubmit = (fieldNames = []) => {
  const [state, setState] = useState(IDLE)
  const key = fieldNames.join('|')

  const run = useCallback(async (action) => {
    setState({ ...IDLE, loading: true })
    try {
      const result = await action()
      setState(IDLE)
      return { ok: true, result }
    } catch (err) {
      const known = key.split('|')
      const fields = {}
      const loose = []
      for (const { path, message } of err.fields ?? []) {
        if (known.includes(path)) fields[path] ??= message
        else if (message) loose.push(message)
      }
      const hasFields = Object.keys(fields).length > 0
      setState({
        loading: false,
        status: err.status ?? null,
        fields,
        error: loose.length ? loose.join(' ') : hasFields ? null : err.message,
      })
      return { ok: false, error: err }
    }
  }, [key])

  const clearField = useCallback((name) => {
    setState((s) => (s.fields[name] ? { ...s, fields: { ...s.fields, [name]: undefined } } : s))
  }, [])

  return { ...state, run, clearField }
}
