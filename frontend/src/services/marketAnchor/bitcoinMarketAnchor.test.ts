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
    expect(result.summary).toBe('BTC 기준 데이터를 찾을 수 없습니다. 코인 후보는 계속 확인할 수 있지만, 시장 기준 정보는 제한됩니다.')

    const binance = buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [], catalogSource: null, newsResult: null, language: 'en' })
    expect(binance).toMatchObject({ status: 'unavailable', instrumentId: null, symbol: 'BTC/USDT' })
    expect(binance.summary).toBe('BTC anchor data could not be found. Crypto candidates can still be reviewed, but market-anchor context is limited.')
  })

  it('finds anchors from provider and market metadata when identifiers are not exact', () => {
    const looseUpbit = {
      ...instrument('catalog-bitcoin-krw', 'BTC', 'upbit', 'KRW'),
      displaySymbol: 'Bitcoin',
      providerSymbol: 'KRW-BTC',
      marketType: 'upbit-krw',
      providerType: 'upbit',
    } satisfies MarketInstrument
    const looseBinance = {
      ...instrument('catalog-bitcoin-usdt', 'BTC', 'binance-futures', 'USDT'),
      displaySymbol: 'Bitcoin perpetual',
      providerSymbol: 'BTCUSDT',
      marketType: 'binance-futures',
      providerType: 'binance-futures',
    } satisfies MarketInstrument

    expect(buildBitcoinMarketAnchor({ marketBucket: 'upbit', instruments: [looseUpbit], catalogSource: 'live', newsResult: null, language: 'en' }).instrumentId).toBe(looseUpbit.id)
    expect(buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [looseBinance], catalogSource: 'live', newsResult: null, language: 'en' }).instrumentId).toBe(looseBinance.id)
  })

  it('marks mock context as limited', () => {
    const result = buildBitcoinMarketAnchor({ marketBucket: 'binance', instruments: [instrument('spot-btc', 'BTCUSDT', 'binance-spot', 'USDT')], catalogSource: 'mock', newsResult: null, language: 'en' })
    expect(result.status).toBe('limited')
    expect(result.dataQuality).toBe('mock')
  })
})
