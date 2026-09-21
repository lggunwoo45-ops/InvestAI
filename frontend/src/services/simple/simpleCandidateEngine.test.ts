import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import type { StockWatchCandidate, WatchCandidate } from '@/types/watchCandidate'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
import { buildSimpleCandidates } from './simpleCandidateEngine'

const cryptoInstrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', providerType: 'upbit', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: 2, volume24h: 100 }
const stockInstrument: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', providerType: 'mock-krx', marketType: 'kospi', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 100 }
const crypto = buildCryptoWatchCandidates({ instruments: [cryptoInstrument], newsResult: null, language: 'en' }) as readonly WatchCandidate[]
const stock = buildStockWatchCandidates({ instruments: [stockInstrument], region: 'korea', newsResult: null, language: 'en' }) as readonly StockWatchCandidate[]

describe('simpleCandidateEngine', () => {
  const input = { cryptoCandidates: crypto, koreaStockCandidates: stock, usStockCandidates: [], marketInstruments: [cryptoInstrument, stockInstrument], language: 'en' as const, maxCandidates: 5 }
  it('is deterministic and prioritizes existing crypto candidates', () => {
    expect(buildSimpleCandidates(input)).toEqual(buildSimpleCandidates(input))
    expect(buildSimpleCandidates(input)[0].assetType).toBe('crypto')
    expect(buildSimpleCandidates(input).some((candidate) => candidate.assetType === 'stock')).toBe(true)
  })
  it('creates crypto planning references when a current price exists', () => expect(buildSimpleCandidates(input)[0].planningReference.available).toBe(true))
  it('never creates numeric planning levels for mock stock data', () => {
    const result = buildSimpleCandidates({ ...input, cryptoCandidates: [] })[0]
    expect(result.dataQuality).toBe('mock')
    expect(result.planningReference.available).toBe(false)
    expect(result.planningReference.firstObservationPrice).toBeNull()
    expect(result.planningReference.reason).toContain('real stock data is not connected')
  })
  it('does not invent a candidate when its instrument is absent', () => expect(buildSimpleCandidates({ ...input, marketInstruments: [] })).toEqual([]))
})
