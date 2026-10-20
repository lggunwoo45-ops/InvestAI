import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PORTFOLIO_KEY } from '@/services/portfolio/portfolioStorage'
import { readScenarios, SCENARIO_KEY, validScenario, validScenarioData, writeScenarios } from './scenarioStorage'
import { scenarioFixture } from './scenarioFixtures'

describe('scenario storage isolation and preservation', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())
  it('round-trips fixed criteria without changing portfolio or watchlist storage', () => {
    localStorage.setItem(PORTFOLIO_KEY, 'original portfolio')
    localStorage.setItem('watchlist', 'original watchlist')
    writeScenarios({ version: 1, scenarios: [scenarioFixture()], events: [] }, null)
    expect(readScenarios().scenarios[0]).toEqual(scenarioFixture())
    expect(localStorage.getItem(PORTFOLIO_KEY)).toBe('original portfolio')
    expect(localStorage.getItem('watchlist')).toBe('original watchlist')
  })
  it.each(['{', JSON.stringify({ version: 2, scenarios: [] }), JSON.stringify({ version: 1, scenarios: [{}], events: [] })])('preserves unreadable or unknown schema data: %s', raw => {
    localStorage.setItem(SCENARIO_KEY, raw)
    expect(readScenarios().error).toBe(true)
    expect(() => writeScenarios({ version: 1, scenarios: [], events: [] }, raw)).toThrow('storage')
    expect(localStorage.getItem(SCENARIO_KEY)).toBe(raw)
  })
  it('blocks stale writers and surfaces quota failures without losing the original', () => {
    const saved = writeScenarios({ version: 1, scenarios: [scenarioFixture()], events: [] }, null)
    expect(() => writeScenarios({ version: 1, scenarios: [], events: [] }, null)).toThrow('conflict')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => writeScenarios({ version: 1, scenarios: [], events: [] }, saved.raw)).toThrow('quota')
    expect(localStorage.getItem(SCENARIO_KEY)).toBe(saved.raw)
  })
  it('rejects reversed or nonfinite prices and mismatched exchange identities', () => {
    const s = scenarioFixture()
    for (const change of [{ stop: 100 }, { target: 110 }, { entry: [111, 100] }, { target: Infinity }, { stop: 0 }, { instrument: { ...s.instrument, quoteCurrency: 'USDT' } }, { instrument: { ...s.instrument, marketId: 'binance-futures' } }, { instrument: { ...s.instrument, providerSymbol: 'KRW-ETH' } }]) expect(validScenario({ ...s, ...change })).toBe(false)
  })
  it('limits monitored scenarios and prevents duplicate instruments or orphan event history', () => {
    const scenarios = ['btc', 'eth', 'sol', 'xrp'].map(asset => scenarioFixture(`upbit-${asset}`))
    expect(validScenarioData({ version: 1, scenarios, events: [] })).toBe(false)
    scenarios[3].enabled = false
    expect(validScenarioData({ version: 1, scenarios, events: [] })).toBe(true)
    expect(validScenarioData({ version: 1, scenarios: [scenarios[0], { ...scenarios[0], id: 'other' }], events: [] })).toBe(false)
    expect(validScenarioData({ version: 1, scenarios: [], events: [{ id: 'event', scenarioId: 'gone', revision: 'old', kind: 'entry', at: 1, price: 1 }] })).toBe(false)
  })
})
