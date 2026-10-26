import type { MarketInstrument, MarketVenue } from '@/types/market'
import { calculateLedger, type TradeLedger } from './tradeLedger'
import { memberStorage } from '@/services/cloud/cloudClient'

export const PORTFOLIO_KEY = 'investai.portfolio.v1'
export const coinVenues = ['upbit-krw', 'upbit-btc', 'upbit-usdt', 'binance-spot'] as const
export type CoinVenue = typeof coinVenues[number]
export interface Position {
  id: string
  exchange: 'upbit' | 'binance'
  venue: CoinVenue
  instrumentId: string
  symbol: string
  quoteCurrency: string
  averagePrice: number
  quantity: number
  targetPrice?: number
  stopPrice?: number
  ledger?: TradeLedger
}
export interface PortfolioState { positions: Position[]; raw: string | null; error: string | null }
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
const shortText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 160
export function validPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false
  const p = value as Position
  if (p.ledger !== undefined) {
    try {
      const calculated = calculateLedger(p.ledger)
      if (!p.ledger.trades.length || p.quantity !== calculated.quantity || p.averagePrice !== calculated.averagePrice) return false
    } catch { return false }
  }
  return [p.id, p.instrumentId, p.symbol, p.quoteCurrency].every(shortText)
    && coinVenues.includes(p.venue) && p.exchange === (p.venue.startsWith('upbit') ? 'upbit' : 'binance')
    && (p.venue === 'upbit-krw' ? p.quoteCurrency === 'KRW' : p.venue === 'upbit-btc' ? p.quoteCurrency === 'BTC' : p.venue === 'upbit-usdt' ? p.quoteCurrency === 'USDT' : /^[A-Z0-9]{2,20}$/.test(p.quoteCurrency))
    && positive(p.averagePrice) && ((positive(p.quantity) && positive(p.averagePrice * p.quantity)) || (p.quantity === 0 && p.ledger !== undefined))
    && [p.targetPrice, p.stopPrice].every(price => price === undefined || (positive(price) && (p.quantity === 0 ? Number.isFinite(price / p.averagePrice * 100) : valuation(p, price) !== null)))
    && (p.targetPrice === undefined || p.stopPrice === undefined || p.stopPrice < p.targetPrice)
}
export function readPortfolio(): PortfolioState {
  try {
    const raw = memberStorage.getItem(PORTFOLIO_KEY)
    if (raw === null) return { positions: [], raw, error: null }
    const data = JSON.parse(raw)
    if (!validPortfolioData(data)) throw new Error('invalid')
    return { positions: data.positions, raw, error: null }
  } catch {
    return { positions: [], raw: null, error: 'storage' }
  }
}
export function validPortfolioData(value: unknown): value is { version: 1 | 2; positions: Position[] } {
  if (!value || typeof value !== 'object') return false
  const data = value as { version: number; positions: Position[] }
  return [1, 2].includes(data.version) && Array.isArray(data.positions) && data.positions.length <= 1000
    && data.positions.every(validPosition) && new Set(data.positions.map(p => p.id)).size === data.positions.length
    && data.positions.reduce((count, p) => count + (p.ledger?.trades.length ?? 0), 0) <= 10000
    && (data.version === 2 || data.positions.every(p => p.ledger === undefined))
}
export function writePortfolio(positions: Position[], expectedRaw: string | null): PortfolioState {
  if (!validPortfolioData({ version: 2, positions })) throw new Error('validation')
  // Never replace unreadable/unknown-version data or silently overwrite another tab's edits.
  const current = readPortfolio()
  if (current.error) throw new Error('storage')
  if (current.raw !== expectedRaw) throw new Error('conflict')
  // v2 prevents older app tabs from silently changing ledger-derived balances.
  const raw = JSON.stringify({ version: positions.some(p => p.ledger) ? 2 : 1, positions })
  memberStorage.setItem(PORTFOLIO_KEY, raw)
  return { positions, raw, error: null }
}
export function positionFor(instrument: MarketInstrument, venue: MarketVenue, averagePrice: number, quantity: number, id: string): Position {
  const position: Position = { id, exchange: venue.startsWith('upbit') ? 'upbit' : 'binance', venue: venue as CoinVenue, instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol, quoteCurrency: instrument.quoteCurrency, averagePrice, quantity }
  if (!validPosition(position) || !coinVenues.includes(venue as CoinVenue) || instrument.marketId !== (position.exchange === 'upbit' ? 'upbit' : 'binance-spot')) throw new Error('validation')
  return position
}
export function valuation(position: Position, price: number | null) {
  if (!positive(price) || !positive(position.quantity)) return null
  const cost = position.averagePrice * position.quantity
  const value = price * position.quantity
  const profit = value - cost
  const percent = (price / position.averagePrice - 1) * 100
  return [cost, value, profit, percent].every(Number.isFinite) ? { cost, value, profit, percent } : null
}
