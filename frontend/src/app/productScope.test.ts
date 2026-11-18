import { describe, expect, it, vi } from 'vitest'
import { createProductScope, isUnavailableProductRequest, productScope } from './productScope'
import { MarketDataService } from '@/services/market/marketDataService'
import { stockCatalogProvider } from '@/services/market/explorer/StockCatalogProvider'

describe('product market boundary', () => {
  it('defaults to crypto and refuses old stock bookmarks, including repeated query values', () => {
    expect(productScope.kind).toBe('crypto')
    for (const query of ['instrumentId=krx-005930', 'instrumentId=upbit-btc&instrumentId=us-aapl', 'venue=nasdaq', 'bucketId=kospi', 'market=us']) expect(isUnavailableProductRequest(query)).toBe(true)
    expect(isUnavailableProductRequest('instrumentId=upbit-btc&tab=downside&display=expert')).toBe(false)
    expect(isUnavailableProductRequest('product=stocks-preview&display=stocks')).toBe(false)
    expect(productScope.kind).toBe('crypto')
  })
  it('blocks stock provider requests and subscriptions before any simulated price can be emitted', async () => {
    const load = vi.fn(stockCatalogProvider.load)
    const service = new MarketDataService(undefined, undefined, [{ ...stockCatalogProvider, load }], createProductScope('crypto'))
    await expect(service.getMarketCatalog('kospi', 'live')).rejects.toThrow('not available')
    await expect(service.getMarketCatalog('kospi', 'mock')).rejects.toThrow('not available')
    expect(load).not.toHaveBeenCalled()
    const instrument = (await stockCatalogProvider.load('kospi')).instruments[0]
    const onState = vi.fn()
    const stop = service.subscribe({ instrument, mode: 'live', timeframe: '1D', onState })
    expect(onState).toHaveBeenCalledTimes(1)
    expect(onState.mock.calls[0][0]).toMatchObject({ snapshot: null, connection: { status: 'disconnected' } })
    stop()
    expect(service.getKnownInstruments(['upbit-btc', 'krx-005930']).has('krx-005930')).toBe(false)
  })
  it('reuses the original stock catalog in the separate stock scope, preserving IDs and demo source', async () => {
    const stockScope = createProductScope('stocks')
    const service = new MarketDataService(undefined, undefined, undefined, stockScope)
    const catalog = await service.getMarketCatalog('kospi', 'live')
    expect(catalog.source).toBe('mock')
    expect(catalog.instruments.some(i => i.id === 'krx-005930' && i.quoteCurrency === 'KRW')).toBe(true)
    await expect(service.getMarketCatalog('upbit-krw', 'live')).rejects.toThrow('not available')
    expect(isUnavailableProductRequest('instrumentId=us-aapl', stockScope)).toBe(false)
    expect(isUnavailableProductRequest('instrumentId=upbit-btc', stockScope)).toBe(true)
  })
})
