import { useEffect, useState } from 'react'

import { dartClient, type DartClient } from '@/services/dart/dartClient'
import type { DartProxyHealthResult } from '@/types/dart'

const RETRY_DELAYS_MS = [1_000, 3_000, 10_000] as const

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
      if (result.status === 'unavailable') {
        const delayIndex = Math.min(retryIndex, RETRY_DELAYS_MS.length - 1)
        const delay = RETRY_DELAYS_MS[delayIndex]
        retryIndex = Math.min(retryIndex + 1, RETRY_DELAYS_MS.length - 1)
        retryTimer = setTimeout(() => { void check() }, delay)
      } else {
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
