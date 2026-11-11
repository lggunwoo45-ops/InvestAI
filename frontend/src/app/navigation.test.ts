import { describe, expect, it } from 'vitest'
import { navigationSection } from './navigation'

describe('navigation context', () => {
  it.each([
    ['/ai-analysis/', '', '#opportunity-records', '/results'],
    ['/ai-analysis', '', '#daily-records', '/ai-analysis'],
    ['/ai-analysis', '', '#ai-usage-plans-title', '/plans'],
    ['/research/', '?mode=journal&asset=ETH', '', '/results'],
    ['/research', '?mode=alerts&asset=ETH', '', '/review-alerts'],
    ['/research', '?mode=position&asset=ETH', '', '/tools'],
    ['/my-analysis', '?instrumentId=upbit-btc', '', '/tools'],
    ['/discover', '', '', '/ai-analysis'],
    ['/not-a-route', '', '', '/not-a-route'],
  ])('places %s %s %s in one product destination', (pathname, search, hash, section) => {
    expect(navigationSection({ pathname, search, hash })).toBe(section)
  })
})
