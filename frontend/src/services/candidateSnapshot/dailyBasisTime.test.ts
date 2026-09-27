import { describe, expect, it } from 'vitest'

import { getDailyBasisTime } from './dailyBasisTime'

describe('getDailyBasisTime', () => {
  it('uses the same-day 08:00 local basis after 08:00', () => {
    const now = new Date(2026, 8, 28, 9, 15)
    const result = getDailyBasisTime(now)
    const basis = new Date(result.currentDailyBasisAt)
    expect(result.isBeforeTodayBasis).toBe(false)
    expect(basis.getHours()).toBe(8)
    expect(basis.getDate()).toBe(28)
    expect(result.tradingDateLabel).toBe('2026-09-28')
  })

  it('uses the most recent basis and identifies the before-08:00 state', () => {
    const now = new Date(2026, 8, 28, 7, 59)
    const result = getDailyBasisTime(now)
    const basis = new Date(result.currentDailyBasisAt)
    const next = new Date(result.nextDailyBasisAt)
    expect(result.isBeforeTodayBasis).toBe(true)
    expect(basis.getHours()).toBe(8)
    expect(basis.getDate()).toBe(27)
    expect(next.getHours()).toBe(8)
    expect(next.getDate()).toBe(28)
  })
})
