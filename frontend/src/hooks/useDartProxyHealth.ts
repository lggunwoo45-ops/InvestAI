import { useEffect, useState } from 'react'

import { dartClient, type DartClient } from '@/services/dart/dartClient'
import type { DartProxyHealthResult } from '@/types/dart'

const RETRY_DELAYS_MS = [1_000, 3_000] as const

/** Checks only the local proxy configuration endpoint; it never contacts OpenDART directly. */
export function useDartProxyHealth(client: DartClient = dartClient): DartProxyHealthResult | null {
  const [health, setHealth] = useState<DartProxyHealthResult | null>(null)

  useEffect(() => {
    let active = true
    let requestId = 0
    let retryIndex = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const clearRetry = () => {
      if (retryTimer !== undefined) clearTimeout(retryTimer)
      retryTimer = undefined
    }
    const check = async () => {
      const currentRequest = ++requestId
      const result = await client.loadHealth()
      if (!active || currentRequest !== requestId) return
      setHealth(result)
      clearRetry()
      if (result.status === 'unavailable' && retryIndex < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[retryIndex++]
        retryTimer = setTimeout(() => { void check() }, delay)
      } else if (result.status !== 'unavailable') {
        retryIndex = 0
      }
    }
    const resync = () => {
      retryIndex = 0
      clearRetry()
      void check()
    }
    const resyncWhenVisible = () => { if (document.visibilityState === 'visible') resync() }

    void check()
    window.addEventListener('focus', resync)
    document.addEventListener('visibilitychange', resyncWhenVisible)
    return () => {
      active = false
      requestId += 1
      clearRetry()
      window.removeEventListener('focus', resync)
      document.removeEventListener('visibilitychange', resyncWhenVisible)
    }
  }, [client])

  return health
}
