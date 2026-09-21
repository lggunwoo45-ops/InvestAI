import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { buildPlanningReference } from './planningReferenceEngine'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: 2, volume24h: 100 }

describe('planningReferenceEngine', () => {
  it('creates deterministic percentage-only crypto references with safe labels', () => {
    const first = buildPlanningReference({ instrument, horizon: 'short', language: 'en' })
    const second = buildPlanningReference({ instrument, horizon: 'short', language: 'en' })
    expect(first).toEqual(second)
    expect(first.observationArea).toMatchObject({ label: 'Observation area', value: 'About 1.5% to 5% below current price' })
    expect(first.riskCheckArea?.label).toBe('Risk check area')
    expect(first.upsideCheckArea?.label).toBe('Upside check area')
    expect(JSON.stringify(first)).not.toMatch(/₩|KRW|USDT|USD/)
    expect(first.notes.join(' ')).toContain('fixed-percentage distances')
  })

  it('uses Korean labels and disables levels without a valid price', () => {
    expect(buildPlanningReference({ instrument, horizon: 'swing', language: 'ko' }).observationArea?.value).toBe('현재가보다 약 3%~9% 아래')
    const unavailable = buildPlanningReference({ instrument: { ...instrument, lastPrice: Number.NaN }, horizon: 'long', language: 'en' })
    expect(unavailable.available).toBe(false)
    expect(unavailable.observationArea).toBeNull()
  })
})
