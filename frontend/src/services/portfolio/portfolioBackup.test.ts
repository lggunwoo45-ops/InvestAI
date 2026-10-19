import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { createPortfolioBackup, mergePortfolioBackup, parsePortfolioBackup } from './portfolioBackup'
import { PORTFOLIO_KEY, readPortfolio, writePortfolio, type Position } from './portfolioStorage'
import { recordTrade } from './tradeLedger'

const position: Position = { id: 'p1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2, targetPrice: 150 }
const traded = recordTrade(position, { id: 't1', side: 'sell', price: 120, quantity: 2, fee: 1, at: '2026-01-01T00:00:00.000Z' })
describe('portfolio backup and storage compatibility', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())
  it('does not write when reading legacy data, then upgrades atomically on a recorded trade', () => {
    const original = JSON.stringify({ version: 1, positions: [position] })
    localStorage.setItem(PORTFOLIO_KEY, original)
    const loaded = readPortfolio()
    expect(loaded.raw).toBe(original)
    expect(localStorage.getItem(PORTFOLIO_KEY)).toBe(original)
    const updated = writePortfolio([traded], loaded.raw)
    expect(JSON.parse(updated.raw!).version).toBe(2)
    expect(readPortfolio().positions).toEqual([traded])
  })
  it('round trips closed holdings, criteria and all trades without watchlists', () => {
    localStorage.setItem('watchlist', 'keep')
    const stored = writePortfolio([traded], null)
    const backup = createPortfolioBackup(stored)
    expect(parsePortfolioBackup(backup).portfolio.positions).toEqual([traded])
    expect(backup).not.toContain('watchlist')
    expect(localStorage.getItem('watchlist')).toBe('keep')
  })
  it('merges missing IDs and skips identical records, including reordered JSON keys', () => {
    const reordered = { ...position, id: position.id }
    const incoming = [{ ...traded, id: 'other' }, reordered]
    const merged = mergePortfolioBackup([position], incoming)
    expect(merged).toMatchObject({ added: 1, skipped: 1 })
    expect(merged.positions[0]).toEqual(position)
    expect(mergePortfolioBackup(merged.positions, incoming)).toMatchObject({ added: 0, skipped: 2 })
  })
  it('rejects an entire restore when any ID conflicts or a ledger has been altered', () => {
    expect(() => mergePortfolioBackup([position], [{ ...position, id: 'new' }, { ...position, quantity: 3 }])).toThrow('conflict')
    const text = createPortfolioBackup({ positions: [traded], raw: null, error: null })
    const data = JSON.parse(text)
    data.portfolio.positions[0].quantity = 1
    expect(() => parsePortfolioBackup(JSON.stringify(data))).toThrow('backup')
  })
  it.each(['null', '{bad', '{"format":"other","version":1}', '{"format":"investai.portfolio.backup","version":99}'])('rejects malformed or unknown backups: %s', text => {
    expect(() => parsePortfolioBackup(text)).toThrow()
  })
  it('rejects oversized files and duplicate IDs', () => {
    expect(() => parsePortfolioBackup(' '.repeat(10 * 1024 * 1024 + 1))).toThrow('size')
    expect(() => mergePortfolioBackup([], [position, position])).toThrow('backup')
  })
  it('preserves current data on restore write failure or stale original', () => {
    const saved = writePortfolio([position], null)
    const merged = mergePortfolioBackup([position], [{ ...traded, id: 'other' }])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => writePortfolio(merged.positions, saved.raw)).toThrow('quota')
    expect(readPortfolio().raw).toBe(saved.raw)
    expect(() => writePortfolio(merged.positions, null)).toThrow('conflict')
  })
})
