import { afterEach, describe, expect, it, vi } from 'vitest'

import { marketDataService } from '@/services/market/marketDataService'
import { queryMarketInstruments } from '@/pages/Market/marketExplorerQuery'
import type { MarketInstrument } from '@/types/market'
import { binanceCatalogProvider } from './BinanceCatalogProvider'
import { stockCatalogProvider } from './StockCatalogProvider'
import { upbitCatalogProvider } from './UpbitCatalogProvider'

afterEach(() => vi.unstubAllGlobals())

function response(data: unknown) {
  return { ok: true, json: async () => data } as Response
}

describe('Sprint 7 market catalogs', () => {
  it('loads all Upbit pairs and maps bilingual names without truncation', async () => {
    const pairs = Array.from({ length: 350 }, (_, index) => ({
      market: `KRW-COIN${index}`, korean_name: `코인${index}`, english_name: `Coin ${index}`,
    }))
    const tickers = pairs.map((pair, index) => ({
      market: pair.market, trade_price: index + 1, signed_change_rate: .01, acc_trade_price_24h: 1000 + index,
    }))
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(response(url.includes('/market/all') ? pairs : tickers))))
    const catalog = await upbitCatalogProvider.load('upbit-krw')

    expect(catalog.instruments).toHaveLength(350)
    expect(catalog.instruments[0]).toMatchObject({
      id: 'upbit-coin0', providerSymbol: 'KRW-COIN0', marketType: 'upbit-krw',
      koreanName: '코인0', englishName: 'Coin 0', lastPrice: 1, change24hPercent: 1,
    })
  })

  it('separates Binance Spot and USDT perpetual futures', async () => {
    const exchange = { symbols: [
      { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT', contractType: 'PERPETUAL' },
      { symbol: 'ETHBTC', status: 'TRADING', baseAsset: 'ETH', quoteAsset: 'BTC', contractType: 'PERPETUAL' },
      { symbol: 'OLDUSDT', status: 'BREAK', baseAsset: 'OLD', quoteAsset: 'USDT', contractType: 'PERPETUAL' },
    ] }
    const tickers = [
      { symbol: 'BTCUSDT', lastPrice: '100', priceChangePercent: '2', quoteVolume: '500', volume: '5' },
      { symbol: 'ETHBTC', lastPrice: '.03', priceChangePercent: '-1', quoteVolume: '10', volume: '100' },
    ]
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(response(url.includes('exchangeInfo') ? exchange : tickers))))
    const spot = await binanceCatalogProvider.load('binance-spot')
    const futures = await binanceCatalogProvider.load('binance-futures')

    expect(spot.instruments.map((item) => item.symbol)).toEqual(['BTCUSDT', 'ETHBTC'])
    expect(futures.instruments.map((item) => item.symbol)).toEqual(['BTCUSDT'])
    expect(futures.instruments[0]).toMatchObject({ id: 'binance-btc', providerSymbol: 'BTCUSDT', providerType: 'binance-futures', volume24h: 500 })
  })

  it('provides 200 stable mock company identities per exchange', async () => {
    for (const venue of ['kospi', 'kosdaq', 'nasdaq', 'nyse'] as const) {
      const catalog = await stockCatalogProvider.load(venue)
      expect(catalog.source).toBe('mock')
      expect(catalog.instruments).toHaveLength(200)
      expect(new Set(catalog.instruments.map((item) => item.id)).size).toBe(200)
      expect(catalog.instruments.every((item) => item.providerSymbol && item.marketType === venue)).toBe(true)
    }
    const korea = await stockCatalogProvider.load('kospi')
    const us = await stockCatalogProvider.load('nasdaq')
    expect(korea.instruments.some((item) => item.id === 'krx-005930' && item.koreanName === '삼성전자')).toBe(true)
    expect(us.instruments.some((item) => item.id === 'us-nvda' && item.name.includes('NVIDIA'))).toBe(true)
  })

  it('searches symbol and bilingual names only inside the supplied venue and sorts deterministically', async () => {
    const korea = await stockCatalogProvider.load('kospi')
    const samsung = korea.instruments.find((item) => item.id === 'krx-005930') as MarketInstrument
    for (const search of ['005930', '삼성전자', 'Samsung']) {
      const matches = queryMarketInstruments(korea.instruments, {
        search, favoritesOnly: false, favoriteIds: new Set(), sortField: 'alphabet', sortDirection: 'asc',
      })
      expect(matches.some((item) => item.id === samsung.id)).toBe(true)
    }
    const favorites = queryMarketInstruments(korea.instruments, {
      search: '', favoritesOnly: true, favoriteIds: new Set([samsung.id]),
      sortField: 'price', sortDirection: 'desc',
    })
    expect(favorites.map((item) => item.id)).toEqual([samsung.id])
    const us = await stockCatalogProvider.load('nasdaq')
    expect(queryMarketInstruments(us.instruments, {
      search: '삼성전자', favoritesOnly: false, favoriteIds: new Set(),
      sortField: 'alphabet', sortDirection: 'asc',
    })).toHaveLength(0)
  })

  it('serves repeated stock catalog requests from the MarketDataService cache', async () => {
    const first = await marketDataService.getMarketCatalog('kosdaq', 'live')
    const second = await marketDataService.getMarketCatalog('kosdaq', 'live')
    expect(second).toBe(first)
  })
})
