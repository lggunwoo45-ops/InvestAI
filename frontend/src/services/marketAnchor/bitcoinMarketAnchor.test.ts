import { describe, expect, it } from 'vitest'

import type { MarketInstrument } from '@/types/market'
import { buildBitcoinMarketAnchor } from './bitcoinMarketAnchor'

const instrument = (id: string, symbol: string, marketId: MarketInstrument['marketId'], quoteCurrency: string): MarketInstrument => ({ id, symbol, displaySymbol: symbol, name: symbol, marketId, marketType: marketId === 'upbit' ? 'upbit-krw' : marketId === 'binance-futures' ? 'binance-futures' : 'binance-spot', quoteCurrency, lastPrice: 100, change24hPercent: 1, volume24h: 1_000 })

describe('bitcoinMarketAnchor', () => {
  it('uses BTC/KRW for Upbit and BTC/USDT spot for Binance', () => {
    const upbit = buildBitcoinMarketAnchor({ marketBucket: 'upbit', instruments: [instrument('upbit-btc', 'BTC/KRW', 'upbit', 'KRW')], catalogSource: 'live', newsResult: null, language: 'en' })
    expect(upbit.instrumentId).toBe('upbit-btc')
    expect(upbit.symbol).toBe('BTC/KRW')

    const binance = buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [instrument('future-btc', 'BTC/USDT', 'binance-futures', 'USDT'), instrument('spot-btc', 'BTC/USDT', 'binance-spot', 'USDT')], catalogSource: 'live', newsResult: null, language: 'en' })
    expect(binance.instrumentId).toBe('spot-btc')
    expect(binance.symbol).toBe('BTC/USDT')
  })

  it('returns a safe unavailable state without fabricating market values', () => {
    const result = buildBitcoinMarketAnchor({ marketBucket: 'upbit', instruments: [], catalogSource: null, newsResult: null, language: 'ko' })
    expect(result).toMatchObject({ status: 'unavailable', instrumentId: null, currentPrice: null, dataQuality: 'unavailable' })
    expect(result.reviewScore.score).toBeNull()
    expect(result.summary).toContain('확인할 수 없습니다')
  })

  it('marks mock context as limited', () => {
    const result = buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [instrument('spot-btc', 'BTCUSDT', 'binance-spot', 'USDT')], catalogSource: 'mock', newsResult: null, language: 'en' })
    expect(result.status).toBe('limited')
    expect(result.dataQuality).toBe('mock')
  })
})
