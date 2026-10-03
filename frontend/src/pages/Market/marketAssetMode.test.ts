import { beforeEach, describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import {
  LAST_MARKET_INSTRUMENT_STORAGE_KEY,
  MARKET_ASSET_MODE_STORAGE_KEY,
  assetModeForInstrument,
  loadLastMarketInstrumentIds,
  loadMarketAssetMode,
  saveLastMarketInstrumentIds,
  saveMarketAssetMode,
  selectDefaultInstrument,
  venueForPersistedInstrumentId,
} from './marketAssetMode'

const instrument = (id: string, symbol: string, marketId: MarketInstrument['marketId']): MarketInstrument => ({
  id,
  symbol,
  marketId,
  name: symbol,
  quoteCurrency: marketId === 'us-stock' ? 'USD' : 'KRW',
  lastPrice: 100,
  change24hPercent: 1,
  volume24h: 1000,
})

describe('Market asset-mode persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults to Crypto and removes an invalid stored mode', () => {
    window.localStorage.setItem(MARKET_ASSET_MODE_STORAGE_KEY, 'commodities')
    expect(loadMarketAssetMode()).toBe('crypto')
    expect(window.localStorage.getItem(MARKET_ASSET_MODE_STORAGE_KEY)).toBeNull()
  })

  it('round-trips a valid asset mode', () => {
    saveMarketAssetMode('korea')
    expect(loadMarketAssetMode()).toBe('korea')
  })

  it.each(['hello', '42', '{"schemaVersion":2}', '{"schemaVersion":1,"instrumentIds":{"crypto":42}}'])('recovers from invalid last-instrument storage: %s', (raw) => {
    window.localStorage.setItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY, raw)
    expect(loadLastMarketInstrumentIds()).toEqual({})
    expect(window.localStorage.getItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY)).toBeNull()
  })

  it('round-trips only mode-scoped instrument ids', () => {
    saveLastMarketInstrumentIds({ crypto: 'upbit-xrp', korea: 'krx-005930', us: 'us-aapl' })
    expect(loadLastMarketInstrumentIds()).toEqual({ crypto: 'upbit-xrp', korea: 'krx-005930', us: 'us-aapl' })
  })

  it('selects BTC/KRW, Samsung Electronics, and Apple as safe defaults with a first-valid fallback', () => {
    const crypto = [instrument('upbit-xrp', 'XRP/KRW', 'upbit'), instrument('upbit-btc', 'BTC/KRW', 'upbit')]
    const korea = [instrument('krx-000660', '000660', 'korea-stock'), instrument('krx-005930', '005930', 'korea-stock')]
    const us = [instrument('us-nvda', 'NVDA', 'us-stock'), instrument('us-aapl', 'AAPL', 'us-stock')]
    expect(selectDefaultInstrument('crypto', crypto)?.id).toBe('upbit-btc')
    expect(selectDefaultInstrument('korea', korea)?.id).toBe('krx-005930')
    expect(selectDefaultInstrument('us', us)?.id).toBe('us-aapl')
    expect(selectDefaultInstrument('us', [us[0]])?.id).toBe('us-nvda')
    expect(selectDefaultInstrument('crypto', [{ ...crypto[1], lastPrice: Number.NaN }, { ...crypto[0], lastPrice: 0 }])).toBeUndefined()
    expect(selectDefaultInstrument('crypto', [{ ...crypto[1], lastPrice: 0 }, crypto[0]])?.id).toBe('upbit-xrp')
  })

  it('maps instruments and persisted ids to a safe asset context', () => {
    expect(assetModeForInstrument(instrument('us-aapl', 'AAPL', 'us-stock'))).toBe('us')
    expect(venueForPersistedInstrumentId('upbit-btc')).toBe('upbit-krw')
    expect(venueForPersistedInstrumentId('upbit-btc-eth')).toBe('upbit-btc')
    expect(venueForPersistedInstrumentId('krx-005930')).toBe('kospi')
    expect(venueForPersistedInstrumentId('us-aapl')).toBe('nasdaq')
  })
})
