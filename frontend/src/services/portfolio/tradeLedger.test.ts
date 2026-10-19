import { describe, expect, it } from 'vitest'
import { calculateLedger, ledgerFor, recordTrade, realizedByCurrency, undoLastTrade, type PortfolioTrade } from './tradeLedger'
import { validPosition, type Position } from './portfolioStorage'

const position: Position = { id: 'p1', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'btc', symbol: 'BTC/KRW', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2, targetPrice: 200 }
const trade: PortfolioTrade = { id: 't1', side: 'buy', price: 200, quantity: 2, fee: 0, at: '2026-01-01T00:00:00.000Z' }
describe('moving average trade ledger', () => {
  it('keeps an immutable opening balance, weights buys, and includes quote-currency fees', () => {
    const added = recordTrade(position, { ...trade, fee: 4 })
    expect(added.averagePrice).toBe(151)
    expect(added.quantity).toBe(4)
    expect(added.ledger?.opening).toEqual({ averagePrice: 100, quantity: 2 })
    expect(position.quantity).toBe(2)
    expect(added.targetPrice).toBe(200)
    const sold = recordTrade(added, { ...trade, id: 't2', side: 'sell', quantity: 1, price: 180, fee: 2 })
    expect(sold.quantity).toBe(3)
    expect(sold.averagePrice).toBe(151)
    expect(calculateLedger(sold.ledger)).toMatchObject({ cost: 453, realized: 27 })
  })
  it('retains realized P/L after full exit and starts the next buy at its own cost', () => {
    const closed = recordTrade(position, { ...trade, side: 'sell', price: 120, fee: 2 })
    expect(closed.quantity).toBe(0)
    expect(validPosition(closed)).toBe(true)
    expect(calculateLedger(closed.ledger).realized).toBe(38)
    const reopened = recordTrade(closed, { ...trade, id: 't2', quantity: 1, price: 90, fee: 1 })
    expect(reopened.averagePrice).toBe(91)
    expect(reopened.quantity).toBe(1)
    expect(calculateLedger(reopened.ledger).realized).toBe(38)
  })
  it('undoes in order, restores the preceding balance and returns to the original holding', () => {
    const buy = recordTrade(position, trade)
    const sell = recordTrade(buy, { ...trade, id: 't2', side: 'sell', quantity: 1, price: 100 })
    expect(calculateLedger(sell.ledger).realized).toBe(-50)
    expect(undoLastTrade(sell)).toEqual(buy)
    expect(undoLastTrade(buy)).toEqual({ ...position, ledger: undefined })
  })
  it('absorbs only relative floating-point dust on a complete sale', () => {
    const bought = recordTrade({ ...position, quantity: 0.1 }, { ...trade, quantity: 0.2, price: 100 })
    const closed = recordTrade(bought, { ...trade, id: 't2', side: 'sell', quantity: 0.3, price: 100 })
    expect(closed.quantity).toBe(0)
    expect(() => recordTrade({ ...position, quantity: 1e-15 }, { ...trade, side: 'sell', quantity: 2e-15 })).toThrow('oversell')
  })
  it.each([{ quantity: 3, side: 'sell' as const }, { price: 0 }, { quantity: -1 }, { fee: -1 }, { fee: Infinity }, { price: Number.MAX_VALUE }, { side: 'sell' as const, fee: 500 }])('rejects invalid or oversold records: %s', changes => {
    expect(() => recordTrade(position, { ...trade, ...changes })).toThrow()
  })
  it('rejects duplicate IDs, time reversal, malformed dates and future entries', () => {
    const added = recordTrade(position, trade)
    expect(() => recordTrade(added, trade)).toThrow('ledger')
    expect(() => recordTrade(added, { ...trade, id: 't2', at: '2025-01-01T00:00:00.000Z' })).toThrow('chronology')
    expect(() => recordTrade(position, { ...trade, at: '2026-02-30T00:00:00.000Z' })).toThrow('ledger')
    expect(() => recordTrade(position, trade, Date.parse('2025-01-01'))).toThrow('future')
  })
  it('rejects a balance that does not match its recorded trades', () => {
    const added = recordTrade(position, trade)
    expect(validPosition({ ...added, quantity: 5 })).toBe(false)
    expect(validPosition({ ...added, averagePrice: 10 })).toBe(false)
    expect(validPosition({ ...position, quantity: 0 })).toBe(false)
  })
  it('keeps realized totals separate by currency and includes closed holdings', () => {
    const closed = recordTrade(position, { ...trade, side: 'sell', price: 120 })
    const usdt = recordTrade({ ...position, id: 'p2', quoteCurrency: 'USDT', venue: 'upbit-usdt' }, { ...trade, side: 'sell', price: 90 })
    expect(realizedByCurrency([closed, usdt, position])).toEqual([{ currency: 'KRW', realized: 40 }, { currency: 'USDT', realized: -20 }])
    expect(calculateLedger(ledgerFor(position)).realized).toBe(0)
  })
})
