import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from './formatMarketValue'

const sample: MarketInstrument = { id: 'test', marketId: 'upbit', symbol: 'TEST', name: 'Test', quoteCurrency: 'KRW', lastPrice: 1, change24hPercent: 1, volume24h: 1 }

describe('market-aware price formatting', () => {
  it.each([
    [0.1, 'KRW', '₩0.1'],
    [0.0001, 'KRW', '₩0.0001'],
    [0.000001, 'USDT', '0.000001 USDT'],
    [0.00000001, 'BTC', '0.00000001 BTC'],
    [148_721_000, 'KRW', '₩148,721,000'],
    [104_382.6, 'USDT', '104,382.6 USDT'],
  ])('formats %s %s without losing nonzero precision', (lastPrice, quoteCurrency, expected) => {
    expect(formatMarketPrice({ ...sample, lastPrice, quoteCurrency })).toBe(expected)
  })

  it('uses a safe fallback for invalid provider numbers', () => {
    expect(formatMarketPrice({ ...sample, lastPrice: Number.NaN })).toBe('—')
    expect(formatMarketChange(Number.NaN)).toBe('—')
    expect(formatMarketVolume(Number.NaN, 'KRW')).toBe('—')
  })
})
