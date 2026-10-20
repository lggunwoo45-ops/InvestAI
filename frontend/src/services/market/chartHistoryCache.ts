import type { MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'

export const CHART_CACHE_KEY = 'investai.chart-preview.v1'
const MAX_ENTRIES = 12
const MAX_AGE = 15 * 60_000
interface Entry { key: string; storedAt: number; candles: readonly Candle[] }
export interface ChartPreview { snapshot: MarketDetailSnapshot; storedAt: number }

function validCandles(value: unknown): value is readonly Candle[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 120 && value.every((item, index) => {
    if (!item || typeof item !== 'object') return false
    const c = item as Candle
    return [c.timestamp, c.open, c.high, c.low, c.close].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
      && typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume >= 0
      && c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close)
      && (!index || c.timestamp > value[index - 1].timestamp)
  })
}

/** Display-only history. Never used as a fresh snapshot or analysis input. */
export class ChartHistoryCache {
  private entries = new Map<string, Entry>()
  private hydrated = false
  private storage() { try { return window.localStorage } catch { return undefined } }
  private key(instrument: MarketInstrument, timeframe: ChartTimeframe) {
    return JSON.stringify([instrument.id, instrument.marketId, instrument.providerSymbol ?? instrument.symbol, instrument.quoteCurrency, timeframe])
  }
  private current(entry: Entry) { const age = Date.now() - entry.storedAt; return age >= 0 && age <= MAX_AGE }
  private hydrate() {
    if (this.hydrated) return
    this.hydrated = true
    try {
      const raw = this.storage()?.getItem(CHART_CACHE_KEY)
      if (!raw || raw.length > 500_000) return
      const value = JSON.parse(raw) as { version?: number; entries?: Entry[] }
      if (value?.version !== 1 || !Array.isArray(value.entries)) return
      for (const entry of value.entries.slice(-MAX_ENTRIES)) {
        if (entry && typeof entry.key === 'string' && entry.key.length <= 500 && typeof entry.storedAt === 'number'
          && Number.isFinite(entry.storedAt) && this.current(entry) && validCandles(entry.candles)) this.entries.set(entry.key, entry)
      }
    } catch { /* Corrupt/unavailable storage must never block live data. */ }
  }
  get(instrument: MarketInstrument, timeframe: ChartTimeframe): ChartPreview | null {
    if (instrument.marketId !== 'upbit') return null
    this.hydrate()
    const entry = this.entries.get(this.key(instrument, timeframe))
    if (!entry || !this.current(entry)) return null
    return { storedAt: entry.storedAt, snapshot: { instrument, timeframe, candles: entry.candles, recentTrades: [], orderbook: { symbolId: instrument.id, asks: [], bids: [], spread: 0 } } }
  }
  put(snapshot: MarketDetailSnapshot) {
    if (snapshot.instrument.marketId !== 'upbit') return
    const candles = snapshot.candles.slice(-120)
    if (!validCandles(candles)) return
    this.hydrate()
    for (const [key, entry] of this.entries) if (!this.current(entry)) this.entries.delete(key)
    const key = this.key(snapshot.instrument, snapshot.timeframe)
    this.entries.delete(key)
    this.entries.set(key, { key, storedAt: Date.now(), candles })
    while (this.entries.size > MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value!)
    try { this.storage()?.setItem(CHART_CACHE_KEY, JSON.stringify({ version: 1, entries: [...this.entries.values()] })) } catch { /* Keep the in-memory preview when quota is unavailable. */ }
  }
}
