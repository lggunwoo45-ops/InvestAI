import { useEffect, useState } from 'react'

import { dashboardService, type DashboardSnapshot } from '@/services/dashboard/dashboardService'
import { useNewsProviderMode } from './useNewsProviderMode'

export function useDashboardData() {
  const { result } = useNewsProviderMode()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)

  useEffect(() => {
    let active = true
    dashboardService.getSnapshot().then((next) => { if (active) setSnapshot(next) })
    return () => { active = false }
  }, [])

  return snapshot ? { ...snapshot, news: result?.articles ?? [] } : null
}
