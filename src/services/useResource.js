import { useCallback, useEffect, useState } from 'react'
import { request } from './api'

export const useResource = (path) => {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState(null)
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    if (!path) return
    let current = true
    request(path).then(
      (data) => {
        if (current) setResult({ path, version, data })
      },
      (error) => {
        if (current) setResult({ path, version, error })
      },
    )
    return () => {
      current = false
    }
  }, [path, version])
  const ready = result?.path === path && result?.version === version
  return {
    data: ready ? result.data : null,
    error: ready ? result.error : null,
    loading: Boolean(path) && !ready,
    reload,
    replace: (data) => setResult({ path, version, data }),
  }
}
