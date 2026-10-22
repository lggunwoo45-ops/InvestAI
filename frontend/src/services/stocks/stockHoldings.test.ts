import { beforeEach, expect, it, vi } from 'vitest'
import { readStockHoldings, STOCK_HOLDINGS_KEY, writeStockHoldings, type StockHolding } from './stockHoldings'
const row: StockHolding = { id: 'lot-1', symbol: '005930', name: '삼성전자', venue: 'kospi', average: 60000, quantity: 2 }
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })
it('saves, reads, edits and deletes stocks without touching coins or watchlists', () => {
  localStorage.setItem('investai.portfolio.v1', 'coin-record')
  localStorage.setItem('watchlist-test', 'watch-record')
  const saved = writeStockHoldings([row], null)!
  expect(readStockHoldings().holdings).toEqual([row])
  expect(writeStockHoldings([{ ...row, quantity: 3 }], saved.raw)?.holdings[0].quantity).toBe(3)
  expect(writeStockHoldings([], readStockHoldings().raw)?.holdings).toEqual([])
  expect(localStorage.getItem('investai.portfolio.v1')).toBe('coin-record')
  expect(localStorage.getItem('watchlist-test')).toBe('watch-record')
})
it('preserves corrupt/versioned storage and rejects stale writes, duplicate IDs and invalid shares', () => {
  localStorage.setItem(STOCK_HOLDINGS_KEY, '{broken')
  expect(readStockHoldings().error).toBe(true)
  expect(writeStockHoldings([row], '{broken')).toBeNull()
  expect(localStorage.getItem(STOCK_HOLDINGS_KEY)).toBe('{broken')
  localStorage.clear()
  const saved = writeStockHoldings([row], null)!
  expect(writeStockHoldings([], null)).toBeNull()
  expect(writeStockHoldings([row, row], saved.raw)).toBeNull()
  expect(writeStockHoldings([{ ...row, quantity: 0.5 }], saved.raw)).toBeNull()
  expect(readStockHoldings().holdings).toEqual([row])
})
it('reports storage access and quota failures instead of claiming success', () => {
  const storage = { getItem: () => { throw new Error('denied') } }
  expect(readStockHoldings(storage).error).toBe(true)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  expect(writeStockHoldings([row], null)).toBeNull()
})
