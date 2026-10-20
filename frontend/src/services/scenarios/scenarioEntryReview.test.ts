import { describe, expect, it } from 'vitest'
import { readFrame, type FrameRead } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { reviewScenarioEntry } from './scenarioEntryReview'
import { observeScenario, scenarioTransitions } from './scenarioTracking'
import { entryReviewFixture, scenarioTestNow as now } from './scenarioFixtures'

describe('entry review evidence', () => {
  const { scenario: s, series } = entryReviewFixture()
  const frame = readFrame('1H', series, now)
  const review = (change: Partial<FrameRead> = {}, price = 113.2) => reviewScenarioEntry(s, { ...frame, ...change }, price)
  it('requires all five checks from closed reference candles and the current execution price', () => {
    expect(observeScenario(s, series, now).entryReview).toMatchObject({ status: 'ready', checks: { trend: true, rebound: true, volume: true, rewardRisk: true, heat: true }, volumeRatio: 1.5 })
    expect(review().rewardRisk).toBeCloseTo((130 - 113.2) / (113.2 - 105))
  })
  it.each([
    ['neutral trend', { direction: 'neutral' }], ['weak volume', { volumeRatio: 1.19 }],
    ['missing volume', { volumeRatio: null }], ['overbought RSI', { rsi: 70 }],
    ['overextended price', { atr: 0.1 }], ['current price lost support', { sma20: 114 }],
    ['no new bar after saving', { asOf: s.updatedAt }],
  ] as [string, Partial<FrameRead>][])('withholds readiness for %s', (_, change) => {
    expect(review(change).status).toBe('waiting')
  })
  it.each([
    ['doji', { open: 113.1 }], ['lower close', { close: 112.6 }],
    ['stop touched', { low: 105 }], ['zone not touched', { low: 114.1, high: 116, open: 114.2, close: 115 }],
  ])('requires a real rebound: %s', (_, change) => {
    const candles = [...frame.candles.slice(0, -1), { ...frame.candles.at(-1)!, ...change }]
    expect(review({ candles }).checks.rebound).toBe(false)
  })
  it('withdraws rebound when the execution drops below the preceding close', () => {
    expect(review({}, 112.5)).toMatchObject({ status: 'waiting', checks: { rebound: false } })
  })
  it('calculates reward/risk at the current price rather than the zone midpoint', () => {
    const changed = { ...s, target: 125 }
    expect(reviewScenarioEntry(changed, frame, 113).checks.rewardRisk).toBe(true)
    expect(reviewScenarioEntry(changed, frame, 114)).toMatchObject({ status: 'waiting', checks: { rewardRisk: false } })
  })
  it('prioritizes a downtrend warning even after the price enters the zone', () => {
    expect(review({ direction: 'sell' }).status).toBe('caution')
  })
  it('withholds a verdict for missing, incomplete, stale or gapped evidence', () => {
    for (const candles of [[], series.candles.slice(0, 49), series.candles.slice(0, -3), series.candles.filter((_, i) => i !== 70)]) {
      expect(observeScenario(s, { ...series, candles }, now).entryReview.status).toBe('unavailable')
    }
    expect(observeScenario(s, { ...series, recentTrades: [] }, now).entryReview.status).toBe('unavailable')
    const unfinished = { ...series.candles.at(-1)!, timestamp: now, volume: 0, close: 111, open: 114 }
    expect(observeScenario(s, { ...series, candles: [...series.candles, unfinished] }, now).entryReview.status).toBe('ready')
  })
  it('distinguishes ready, caution and lost conditions without inventing recovery events', () => {
    const ready = observeScenario(s, series, now)
    const waiting = { ...ready, entryReview: review({ volumeRatio: 1 }) }
    const missing = { ...ready, entryReview: review({ issue: 'history' }) }
    const caution = { ...ready, entryReview: review({ direction: 'sell' }) }
    const outside = observeScenario(s, { ...series, recentTrades: [{ ...series.recentTrades![0], price: 115 }] }, now)
    expect(scenarioTransitions(null, ready)).toEqual([])
    expect(scenarioTransitions(outside, ready)).toEqual(['ready'])
    expect(scenarioTransitions(waiting, ready)).toEqual(['ready'])
    expect(scenarioTransitions(ready, ready)).toEqual([])
    expect(scenarioTransitions(ready, waiting)).toEqual(['ready-lost'])
    expect(scenarioTransitions(ready, outside)).toEqual(['ready-lost'])
    expect(scenarioTransitions(ready, caution)).toEqual(['caution'])
    expect(scenarioTransitions(ready, missing)).toEqual([])
    expect(scenarioTransitions(missing, ready)).toEqual([])
    expect(scenarioTransitions({ ...ready, revision: 'old' }, ready)).toEqual([])
  })
})
