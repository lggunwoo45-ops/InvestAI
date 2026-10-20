import { describe, expect, it } from 'vitest'
import { observeScenario, scenarioTransitions } from './scenarioTracking'
import { scenarioFixture, scenarioSeries, scenarioTestNow as now } from './scenarioFixtures'

describe('scenario observation and transitions', () => {
  const s = scenarioFixture()
  it.each([[99, 'waiting'], [100, 'entry'], [110, 'entry'], [111, 'waiting'], [130, 'target'], [90, 'stop']])('uses inclusive threshold %s → %s', (price, state) => {
    expect(observeScenario(s, scenarioSeries(Number(price)), now).state).toBe(state)
  })
  it('ignores persisted quotes, mock data, stale/future executions and disconnections', () => {
    const live = scenarioSeries(90)
    for (const data of [ { ...live, recentTrades: [] }, { ...live, dataQuality: 'mock' as const }, { ...live, connectionStatus: 'disconnected' },
      { ...live, recentTrades: [{ ...live.recentTrades![0], timestamp: now - 90_001 }] }, { ...live, recentTrades: [{ ...live.recentTrades![0], timestamp: now + 1 }] }, { ...live, updatedAt: now - 90_001 }]) {
      expect(observeScenario(s, data, now)).toMatchObject({ state: 'unavailable', price: null, weakened: null })
    }
  })
  it('detects new closed reference-bar weakening but never missing evidence or an unchanged bar', () => {
    expect(observeScenario(s, scenarioSeries(115, -1), now).weakened).toBe(true)
    expect(observeScenario({ ...s, baseline: { ...s.baseline, frameAsOf: now } }, scenarioSeries(115, -1), now).weakened).toBe(false)
    expect(observeScenario(s, { ...scenarioSeries(), candles: [] }, now).weakened).toBeNull()
    expect(observeScenario({ ...s, baseline: { ...s.baseline, frameDirection: 'sell' } }, scenarioSeries(115, -1), now).weakened).toBe(false)
  })
  it('emits newly observed changes once; initial load, reconnection and revision changes only establish a baseline', () => {
    const waiting = observeScenario(s, scenarioSeries(), now)
    const entry = observeScenario(s, scenarioSeries(105), now)
    const stop = observeScenario(s, scenarioSeries(90, -1), now)
    expect(scenarioTransitions(null, entry)).toEqual([])
    expect(scenarioTransitions(waiting, entry)).toEqual(['entry'])
    expect(scenarioTransitions(entry, entry)).toEqual([])
    expect(scenarioTransitions(entry, stop)).toEqual(['stop', 'weakened'])
    expect(scenarioTransitions({ ...waiting, price: null, state: 'unavailable' }, stop)).toEqual([])
    expect(scenarioTransitions({ ...waiting, revision: 'old' }, stop)).toEqual([])
    expect(scenarioTransitions({ ...waiting, at: now - 15_001 }, stop)).toEqual([])
    expect(scenarioTransitions({ ...waiting, at: now + 1 }, stop)).toEqual([])
  })
})
