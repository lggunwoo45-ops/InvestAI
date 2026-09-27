export const DAILY_BASIS_HOUR = 8

export interface DailyBasisTime {
  currentDailyBasisAt: string
  nextDailyBasisAt: string
  tradingDateLabel: string
  isBeforeTodayBasis: boolean
}

function localDateLabel(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const date = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

/** Local-time model only. A true KST/server schedule is deferred until a backend exists. */
export function getDailyBasisTime(now: Date): DailyBasisTime {
  const todayBasis = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_BASIS_HOUR, 0, 0, 0)
  const isBeforeTodayBasis = now.getTime() < todayBasis.getTime()
  const current = new Date(todayBasis)
  if (isBeforeTodayBasis) current.setDate(current.getDate() - 1)
  const next = new Date(current)
  next.setDate(next.getDate() + 1)
  return {
    currentDailyBasisAt: current.toISOString(),
    nextDailyBasisAt: next.toISOString(),
    tradingDateLabel: localDateLabel(current),
    isBeforeTodayBasis,
  }
}

export function getLocalDateLabel(now: Date): string { return localDateLabel(now) }
