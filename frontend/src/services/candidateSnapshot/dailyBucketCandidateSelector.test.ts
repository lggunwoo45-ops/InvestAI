import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import type { WatchCandidate } from '@/types/watchCandidate'
import { selectDailyBucketCandidates } from './dailyBucketCandidateSelector'

const instrument = (id: string, marketId: MarketInstrument['marketId'], marketType: MarketInstrument['marketType'], price = 100): MarketInstrument => ({ id, marketId, marketType, symbol: id, name: id, quoteCurrency: 'USD', lastPrice: price, change24hPercent: 1, volume24h: 100 })
const candidate = (instrumentId: string, rank: number) => ({ id: `candidate-${instrumentId}`, instrumentId, rank } as WatchCandidate)

describe('selectDailyBucketCandidates', () => {
  const instruments = [instrument('upbit-a', 'upbit', 'upbit-krw'), instrument('binance-a', 'binance-spot', 'binance-spot'), instrument('kospi-a', 'korea-stock', 'kospi'), instrument('kosdaq-a', 'korea-stock', 'kosdaq'), instrument('us-a', 'us-stock', 'nasdaq'), instrument('invalid', 'upbit', 'upbit-krw', Number.NaN)]
  const candidates = ['binance-a', 'upbit-a', 'invalid', 'kosdaq-a', 'kospi-a', 'us-a'].map(candidate)

  it('keeps existing candidate order while separating all market buckets', () => {
    expect(selectDailyBucketCandidates('upbit', candidates, instruments).map((item) => item.instrument.id)).toEqual(['upbit-a'])
    expect(selectDailyBucketCandidates('binance', candidates, instruments).map((item) => item.instrument.id)).toEqual(['binance-a'])
    expect(selectDailyBucketCandidates('kospi', candidates, instruments).map((item) => item.instrument.id)).toEqual(['kospi-a'])
    expect(selectDailyBucketCandidates('kosdaq', candidates, instruments).map((item) => item.instrument.id)).toEqual(['kosdaq-a'])
    expect(selectDailyBucketCandidates('usStocks', candidates, instruments).map((item) => item.instrument.id)).toEqual(['us-a'])
  })

  it('excludes invalid prices without fabricating replacements', () => {
    expect(selectDailyBucketCandidates('upbit', candidates, instruments).some((item) => item.instrument.id === 'invalid')).toBe(false)
  })
})
