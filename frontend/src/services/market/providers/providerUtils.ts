import type { MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe, MarketDetailSnapshot, OrderbookLevel, RecentTrade } from '@/types/marketDetail'

export const timeframeMilliseconds: Record<ChartTimeframe, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1H': 3_600_000,
  '4H': 14_400_000,
  '1D': 86_400_000,
}

export function finiteNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function updateInstrumentPrice(instrument: MarketInstrument, lastPrice: number, change24hPercent?: number): MarketInstrument {
  return {
    ...instrument,
    lastPrice: Number.isFinite(lastPrice) ? lastPrice : instrument.lastPrice,
    change24hPercent: change24hPercent !== undefined && Number.isFinite(change24hPercent) ? change24hPercent : instrument.change24hPercent,
  }
}

export function mergeCandle(candles: readonly Candle[], candle: Candle, limit = 200): readonly Candle[] {
  const last = candles.at(-1)
  if (last?.timestamp === candle.timestamp) return [...candles.slice(0, -1), candle]
  if (!last || candle.timestamp > last.timestamp) return [...candles, candle].slice(-limit)
  return candles
}

export function prependTrade(trades: readonly RecentTrade[], trade: RecentTrade): readonly RecentTrade[] {
  if (trades[0]?.id === trade.id) return trades
  return [trade, ...trades].slice(0, 20)
}

export function buildOrderbookLevels(levels: readonly (readonly [string | number, string | number])[]): readonly OrderbookLevel[] {
  return levels.filter(([priceValue, amountValue]) => Number.isFinite(Number(priceValue)) && Number.isFinite(Number(amountValue))).slice(0, 10).map(([priceValue, amountValue]) => {
    const price = Number(priceValue)
    const amount = Number(amountValue)
    return { price, amount, total: price * amount }
  })
}

export function applyTrade(snapshot: MarketDetailSnapshot, trade: RecentTrade): MarketDetailSnapshot {
  return {
    ...snapshot,
    instrument: updateInstrumentPrice(snapshot.instrument, trade.price),
    recentTrades: prependTrade(snapshot.recentTrades, trade),
  }
}

export function createTradeCandle(snapshot: MarketDetailSnapshot, trade: RecentTrade): Candle {
  const interval = timeframeMilliseconds[snapshot.timeframe]
  const timestamp = Math.floor(trade.timestamp / interval) * interval
  const current = snapshot.candles.at(-1)
  if (current?.timestamp === timestamp) {
    return {
      ...current,
      high: Math.max(current.high, trade.price),
      low: Math.min(current.low, trade.price),
      close: trade.price,
      volume: current.volume + trade.amount,
    }
  }
  const open = current?.close ?? trade.price
  return { timestamp, open, high: Math.max(open, trade.price), low: Math.min(open, trade.price), close: trade.price, volume: trade.amount }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Market request failed with ${response.status}`)
  return response.json() as Promise<T>
}

export async function decodeWebSocketData(data: unknown): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return data.text()
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data)
  throw new Error('Unsupported WebSocket payload')
}
