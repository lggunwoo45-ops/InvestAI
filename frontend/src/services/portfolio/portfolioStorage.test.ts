import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { PORTFOLIO_KEY, readPortfolio, validPosition, valuation, writePortfolio, positionFor, type Position } from './portfolioStorage'

const position: Position = { id: 'p1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2 }
describe('portfolio persistence and valuation', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())
  it('round trips CRUD without touching watchlists', () => {
    localStorage.setItem('watchlist', 'keep')
    const first = writePortfolio([position], null)
    expect(readPortfolio().positions).toEqual([position])
    const edited = writePortfolio([{ ...position, quantity: 3 }], first.raw)
    expect(readPortfolio().positions[0].quantity).toBe(3)
    writePortfolio([], edited.raw)
    expect(readPortfolio().positions).toEqual([])
    expect(localStorage.getItem('watchlist')).toBe('keep')
  })
  it.each([0, -1, NaN, Infinity, Number.MAX_VALUE])('rejects invalid or overflowing price %s', averagePrice => {
    expect(validPosition({ ...position, averagePrice })).toBe(false)
    expect(() => writePortfolio([{ ...position, averagePrice }], null)).toThrow()
  })
  it('rejects incompatible venue, exchange, currency and duplicate IDs', () => {
    expect(validPosition({ ...position, quoteCurrency: 'USD' })).toBe(false)
    expect(validPosition({ ...position, exchange: 'binance' })).toBe(false)
    expect(validPosition({ ...position, venue: 'binance-futures' })).toBe(false)
    expect(() => writePortfolio([position, position], null)).toThrow()
    expect(() => positionFor({ id: 'x', symbol: 'BTC', name: 'BTC', marketId: 'binance-futures', quoteCurrency: 'USDT', lastPrice: 1, change24hPercent: 0, volume24h: 0 }, 'binance-futures', 1, 1, 'id')).toThrow()
  })
  it.each(['{broken', '{"version":2,"positions":[]}', '{"version":1,"positions":[{}]}', 'null'])('preserves malformed or unknown schemas: %s', raw => {
    localStorage.setItem(PORTFOLIO_KEY, raw)
    expect(readPortfolio().error).toBeTruthy()
    expect(() => writePortfolio([], null)).toThrow()
    expect(localStorage.getItem(PORTFOLIO_KEY)).toBe(raw)
  })
  it('does not overwrite stale tab data', () => {
    writePortfolio([position], null)
    expect(() => writePortfolio([], null)).toThrow('conflict')
    expect(readPortfolio().positions).toHaveLength(1)
  })
  it('reports storage read and write denial', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => writePortfolio([position], null)).toThrow('quota')
    expect(readPortfolio().positions).toEqual([])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(readPortfolio().error).toBeTruthy()
  })
  it('calculates gains, losses and zero change in quote currency', () => {
    expect(valuation(position, 125)).toEqual({ cost: 200, value: 250, profit: 50, percent: 25 })
    expect(valuation(position, 75)).toEqual({ cost: 200, value: 150, profit: -50, percent: -25 })
    expect(valuation(position, 100)?.profit).toBe(0)
    for (const price of [null, 0, -1, NaN, Infinity, Number.MAX_VALUE]) expect(valuation(position, price)).toBeNull()
  })
})
