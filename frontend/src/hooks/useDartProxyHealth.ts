import { useEffect, useState } from 'react'

import { dartClient, type DartClient } from '@/services/dart/dartClient'
import type { DartProxyHealthResult } from '@/types/dart'

/** Checks only the local proxy configuration endpoint; it never contacts OpenDART directly. */
export function useDartProxyHealth(client: DartClient = dartClient): DartProxyHealthResult | null {
  const [health, setHealth] = useState<DartProxyHealthResult | null>(null)

  useEffect(() => {
    let active = true
    void client.loadHealth().then((result) => { if (active) setHealth(result) })
    return () => { active = false }
  }, [client])

  return health
}
