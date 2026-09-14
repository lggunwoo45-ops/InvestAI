import { describe, expect, it } from 'vitest'

import { getMarketSessionStatus } from '@/utils/marketSessions'

describe('getMarketSessionStatus', () => {
  it('keeps crypto open at all times', () => {
    expect(getMarketSessionStatus('crypto', new Date('2026-09-13T00:00:00Z'))).toBe('always-open')
  })

  it('calculates Korea and US sessions in their local time zones', () => {
    expect(getMarketSessionStatus('korea', new Date('2026-09-14T01:00:00Z'))).toBe('open')
    expect(getMarketSessionStatus('us', new Date('2026-09-14T15:00:00Z'))).toBe('open')
  })

  it('closes exchange sessions on weekends', () => {
    expect(getMarketSessionStatus('korea', new Date('2026-09-13T01:00:00Z'))).toBe('closed')
    expect(getMarketSessionStatus('us', new Date('2026-09-13T15:00:00Z'))).toBe('closed')
  })
})
