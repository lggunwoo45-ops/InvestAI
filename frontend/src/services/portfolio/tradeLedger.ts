import type { Position } from './portfolioStorage'

export interface PortfolioTrade { id: string; side: 'buy' | 'sell'; price: number; quantity: number; fee: number; at: string }
export interface TradeLedger { version: 1; opening: { averagePrice: number; quantity: number }; trades: PortfolioTrade[] }
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
export const MAX_TRADES = 1000

/** Replay in recorded chronological order. Stored balances are never trusted over the ledger. */
export function calculateLedger(value: unknown) {
  const ledger = value as TradeLedger | null
  if (!ledger || ledger.version !== 1 || !positive(ledger.opening?.averagePrice) || !positive(ledger.opening?.quantity)
    || !Array.isArray(ledger.trades) || ledger.trades.length > MAX_TRADES) throw new Error('ledger')
  let quantity = ledger.opening.quantity
  let averagePrice = ledger.opening.averagePrice
  let cost = quantity * averagePrice
  let realized = 0
  let lastTime = -Infinity
  const ids = new Set<string>()
  const rows: { trade: PortfolioTrade; realized: number; quantity: number; averagePrice: number }[] = []
  if (!positive(cost)) throw new Error('range')
  for (const trade of ledger.trades) {
    if (!trade || typeof trade.id !== 'string' || !trade.id.trim() || trade.id.length > 160 || ids.has(trade.id)
      || !['buy', 'sell'].includes(trade.side) || !positive(trade.price) || !positive(trade.quantity)
      || typeof trade.fee !== 'number' || !Number.isFinite(trade.fee) || trade.fee < 0
      || typeof trade.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(trade.at)
      || !Number.isFinite(Date.parse(trade.at)) || new Date(trade.at).toISOString() !== trade.at) throw new Error('ledger')
    const time = Date.parse(trade.at)
    if (time < lastTime) throw new Error('chronology')
    lastTime = time
    ids.add(trade.id)
    const gross = trade.price * trade.quantity
    if (!positive(gross)) throw new Error('range')
    let tradeProfit = 0
    if (trade.side === 'buy') {
      const nextQuantity = quantity + trade.quantity
      const nextCost = cost + gross + trade.fee
      if (!(nextQuantity > quantity) || !(nextCost > cost)) throw new Error('range')
      quantity = nextQuantity
      cost = nextCost
      averagePrice = cost / quantity
    } else {
      if (quantity === 0 || trade.fee > gross) throw new Error('oversell')
      // Only absorb relative machine-rounding dust, never a fixed minimum coin quantity.
      const closes = Math.abs(quantity - trade.quantity) <= Number.EPSILON * 8 * Math.max(quantity, trade.quantity)
      if (trade.quantity > quantity && !closes) throw new Error('oversell')
      const nextQuantity = closes ? 0 : quantity - trade.quantity
      if (nextQuantity === quantity) throw new Error('range')
      const remainingCost = closes ? 0 : averagePrice * nextQuantity
      tradeProfit = gross - trade.fee - (cost - remainingCost)
      realized += tradeProfit
      quantity = nextQuantity
      cost = remainingCost
    }
    if (![quantity, cost, averagePrice, realized, tradeProfit].every(Number.isFinite) || !positive(averagePrice)
      || (quantity > 0 && !positive(cost))) throw new Error('range')
    rows.push({ trade, realized: tradeProfit, quantity, averagePrice })
  }
  return { quantity, averagePrice, cost, realized, rows }
}

export function ledgerFor(position: Position): TradeLedger {
  return position.ledger ?? { version: 1, opening: { averagePrice: position.averagePrice, quantity: position.quantity }, trades: [] }
}

export function recordTrade(position: Position, trade: PortfolioTrade, now = Date.now()): Position {
  if (Date.parse(trade.at) > now) throw new Error('future')
  const previous = ledgerFor(position)
  const ledger: TradeLedger = { ...previous, trades: [...previous.trades, trade] }
  const result = calculateLedger(ledger)
  return { ...position, ledger, averagePrice: result.averagePrice, quantity: result.quantity }
}

export function undoLastTrade(position: Position): Position {
  if (!position.ledger?.trades.length) throw new Error('ledger')
  const ledger = { ...position.ledger, trades: position.ledger.trades.slice(0, -1) }
  const result = calculateLedger(ledger)
  return { ...position, ledger: ledger.trades.length ? ledger : undefined, averagePrice: result.averagePrice, quantity: result.quantity }
}

export function realizedByCurrency(positions: readonly Position[]) {
  const totals = new Map<string, number>()
  for (const position of positions) {
    if (!position.ledger) continue
    totals.set(position.quoteCurrency, (totals.get(position.quoteCurrency) ?? 0) + calculateLedger(position.ledger).realized)
  }
  return [...totals].map(([currency, realized]) => ({ currency, realized: Number.isFinite(realized) ? realized : null }))
}
