import { describe, expect, it } from 'vitest'
import { scenarioFixture } from '@/services/scenarios/scenarioFixtures'
import { scenarioSource, reviewSource } from './monitorSources'

describe('monitor source identity and evidence', () => {
  it('keeps KRW and USDT spot scenarios distinct from futures reviews', () => {
    const s = scenarioFixture()
    expect(scenarioSource(s).instrument).toEqual({ venue: 'upbit', asset: 'BTC', quote: 'KRW' })
    const spot = scenarioSource({ ...s, positionId: 'holding', instrument: { ...s.instrument, marketId: 'binance-spot', symbol: 'ETHUSDT', quoteCurrency: 'USDT' } })
    expect(spot.instrument).toEqual({ venue: 'binance-spot', asset: 'ETH', quote: 'USDT' })
    expect(spot.source.positionId).toBe('holding')
    spot.entry[0] = 1; expect(s.entry[0]).not.toBe(1)
    const review = reviewSource({ id: 'r1', asset: 'ETH', at: 123, price: 100, funding: -.001, interest: 200, volatility: .5, signals: ['aboveMean'], note: 'original' })
    expect(review.instrument.venue).toBe('binance-futures')
    expect(review.source.metrics).toEqual({ funding: -.001, interest: 200, volatility: .5 })
  })
})
