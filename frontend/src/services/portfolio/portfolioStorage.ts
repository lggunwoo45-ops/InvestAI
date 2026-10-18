import type { MarketInstrument, MarketVenue } from '@/types/market'

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
}
export interface PortfolioState { positions: Position[]; raw: string | null; error: string | null }
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
const shortText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 160
export function validPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false
  const p = value as Position
  return [p.id, p.instrumentId, p.symbol, p.quoteCurrency].every(shortText)
    && coinVenues.includes(p.venue) && p.exchange === (p.venue.startsWith('upbit') ? 'upbit' : 'binance')
    && (p.venue === 'upbit-krw' ? p.quoteCurrency === 'KRW' : p.venue === 'upbit-btc' ? p.quoteCurrency === 'BTC' : p.venue === 'upbit-usdt' ? p.quoteCurrency === 'USDT' : /^[A-Z0-9]{2,20}$/.test(p.quoteCurrency))
    && positive(p.averagePrice) && positive(p.quantity) && positive(p.averagePrice * p.quantity)
    && [p.targetPrice, p.stopPrice].every(price => price === undefined || (positive(price) && valuation(p, price) !== null))
    && (p.targetPrice === undefined || p.stopPrice === undefined || p.stopPrice < p.targetPrice)
}
export function readPortfolio(): PortfolioState {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY)
    if (raw === null) return { positions: [], raw, error: null }
    const data = JSON.parse(raw)
    if (data.version !== 1 || !Array.isArray(data.positions) || data.positions.length > 1000
      || !data.positions.every(validPosition) || new Set(data.positions.map((p: Position) => p.id)).size !== data.positions.length) throw new Error('invalid')
    return { positions: data.positions, raw, error: null }
  } catch {
    return { positions: [], raw: null, error: 'storage' }
  }
}
export function writePortfolio(positions: Position[], expectedRaw: string | null): PortfolioState {
  if (positions.length > 1000 || !positions.every(validPosition) || new Set(positions.map(p => p.id)).size !== positions.length) throw new Error('validation')
  // Never replace unreadable/unknown-version data or silently overwrite another tab's edits.
  const current = readPortfolio()
  if (current.error) throw new Error('storage')
  if (current.raw !== expectedRaw) throw new Error('conflict')
  const raw = JSON.stringify({ version: 1, positions })
  localStorage.setItem(PORTFOLIO_KEY, raw)
  return { positions, raw, error: null }
}
export function positionFor(instrument: MarketInstrument, venue: MarketVenue, averagePrice: number, quantity: number, id: string): Position {
  const position: Position = { id, exchange: venue.startsWith('upbit') ? 'upbit' : 'binance', venue: venue as CoinVenue, instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol, quoteCurrency: instrument.quoteCurrency, averagePrice, quantity }
  if (!validPosition(position) || !coinVenues.includes(venue as CoinVenue) || instrument.marketId !== (position.exchange === 'upbit' ? 'upbit' : 'binance-spot')) throw new Error('validation')
  return position
}
export function valuation(position: Position, price: number | null) {
  if (!positive(price)) return null
  const cost = position.averagePrice * position.quantity
  const value = price * position.quantity
  const profit = value - cost
  const percent = (price / position.averagePrice - 1) * 100
  return [cost, value, profit, percent].every(Number.isFinite) ? { cost, value, profit, percent } : null
}
