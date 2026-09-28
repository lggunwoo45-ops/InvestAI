import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import type { WatchCandidate } from '@/types/watchCandidate'
import { selectDailyBucketCandidates } from './dailyBucketCandidateSelector'

const instrument = (id: string, marketId: MarketInstrument['marketId'], marketType: MarketInstrument['marketType'], price = 100): MarketInstrument => ({ id, marketId, marketType, symbol: id, name: id, quoteCurrency: 'USD', lastPrice: price, change24hPercent: 1, volume24h: 100 })
const candidate = (instrumentId: string, rank: number) => ({ id: `candidate-${instrumentId}`, instrumentId, rank } as WatchCandidate)

describe('selectDailyBucketCandidates', () => {
  const instruments = [instrument('upbit-a', 'upbit', 'upbit-krw'), { ...instrument('upbit-btc', 'upbit', 'upbit-krw'), symbol: 'BTC/KRW', quoteCurrency: 'KRW' }, instrument('binance-a', 'binance-spot', 'binance-spot'), { ...instrument('binance-btc', 'binance-spot', 'binance-spot'), symbol: 'BTC/USDT', quoteCurrency: 'USDT' }, instrument('kospi-a', 'korea-stock', 'kospi'), instrument('kosdaq-a', 'korea-stock', 'kosdaq'), instrument('us-a', 'us-stock', 'nasdaq'), instrument('invalid', 'upbit', 'upbit-krw', Number.NaN)]
  const candidates = ['binance-btc', 'binance-a', 'upbit-btc', 'upbit-a', 'invalid', 'kosdaq-a', 'kospi-a', 'us-a'].map(candidate)

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

  it('keeps Bitcoin market anchors separate from the five candidate slots', () => {
    expect(selectDailyBucketCandidates('upbit', candidates, instruments).map((item) => item.instrument.id)).toEqual(['upbit-a'])
    expect(selectDailyBucketCandidates('binance', candidates, instruments).map((item) => item.instrument.id)).toEqual(['binance-a'])

    const altInstruments = Array.from({ length: 5 }, (_, index) => instrument(`upbit-alt-${index}`, 'upbit', 'upbit-krw'))
    const withFiveAlts = [instruments.find((item) => item.id === 'upbit-btc')!, ...altInstruments]
    const selected = selectDailyBucketCandidates('upbit', withFiveAlts.map((item, index) => candidate(item.id, index + 1)), withFiveAlts)
    expect(selected).toHaveLength(5)
    expect(selected.map((item) => item.instrument.id)).toEqual(altInstruments.map((item) => item.id))
  })
})
