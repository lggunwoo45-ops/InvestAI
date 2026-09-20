import { describe, expect, it } from 'vitest'
import { demoScopeConfig, getDemoScopeSummary } from './demoScopeConfig'

describe('demoScopeConfig', () => {
  it('marks the crypto workflow available as a beta', () => expect(demoScopeConfig.capabilities.find((item) => item.area === 'cryptoCandidates')?.status).toBe('beta'))
  it('marks stock candidates limited', () => expect(demoScopeConfig.capabilities.find((item) => item.area === 'stockCandidates')?.status).toBe('limited'))
  it('keeps real AI planned and trading unavailable', () => {
    expect(demoScopeConfig.capabilities.find((item) => item.area === 'realAi')?.status).toBe('planned')
    expect(demoScopeConfig.capabilities.find((item) => item.area === 'trading')?.status).toBe('notAvailable')
  })
  it('provides complete English and Korean demo flows without unsafe claims', () => {
    expect(getDemoScopeSummary('en').demoFlow).toHaveLength(8)
    expect(getDemoScopeSummary('ko').demoFlow).toHaveLength(8)
    expect(JSON.stringify([getDemoScopeSummary('en'), getDemoScopeSummary('ko')]).toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed profit|profit expected|fully automated investment advisor/)
  })
})
