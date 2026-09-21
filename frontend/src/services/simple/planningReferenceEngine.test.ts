import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { buildPlanningReference } from './planningReferenceEngine'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: 2, volume24h: 100 }

describe('planningReferenceEngine', () => {
  it('creates deterministic crypto observation references with safe labels', () => {
    const first = buildPlanningReference({ instrument, horizon: 'short', language: 'en' })
    const second = buildPlanningReference({ instrument, horizon: 'short', language: 'en' })
    expect(first).toEqual(second)
    expect(first.firstObservationPrice).toMatchObject({ label: '1st Observation Price', value: '₩98,500' })
    expect(first.riskReferencePrice?.label).toBe('Risk Reference Price')
    expect(first.profitTakingReferenceRange?.label).toBe('Profit-Taking Reference Range')
    expect(first.notes.join(' ')).toContain('rule-based planning references')
  })

  it('uses Korean labels and disables levels without a valid price', () => {
    expect(buildPlanningReference({ instrument, horizon: 'swing', language: 'ko' }).secondObservationPrice?.label).toBe('2차 관찰가')
    const unavailable = buildPlanningReference({ instrument: { ...instrument, lastPrice: Number.NaN }, horizon: 'long', language: 'en' })
    expect(unavailable.available).toBe(false)
    expect(unavailable.firstObservationPrice).toBeNull()
  })
})
