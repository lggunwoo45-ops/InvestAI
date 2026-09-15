import { useEffect, useState } from 'react'

import { dashboardService, type DashboardSnapshot } from '@/services/dashboard/dashboardService'

export function useDashboardData() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)

  useEffect(() => {
    let active = true
    dashboardService.getSnapshot().then((next) => { if (active) setSnapshot(next) })
    return () => { active = false }
  }, [])

  return snapshot
}
