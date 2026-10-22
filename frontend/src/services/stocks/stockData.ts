import type { Candle } from '@/types/marketDetail'

export interface StockSnapshot {
  provider: 'KIS'; market: 'KRX'; currency: 'KRW'
  quote: { symbol: string; price: number; changePercent: number; volume: number; fetchedAt: number }
  candles: Candle[]
  historyError: string | null
}
export class StockDataError extends Error {
  constructor(public code: string, public retryAfter = 30) { super(code) }
}
export function stockRelayBase(configured = import.meta.env.VITE_STOCK_RELAY_URL ?? '', hostname = window.location.hostname): string | null {
  if (!configured) return ['localhost', '127.0.0.1'].includes(hostname) ? '' : null
  try {
    const url = new URL(configured)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  } catch { return null }
}
export function validateStockSnapshot(value: unknown, symbol: string, now = Date.now()): StockSnapshot {
  const data = value as StockSnapshot | undefined
  const quote = data?.quote
  if (data?.provider !== 'KIS' || data.market !== 'KRX' || data.currency !== 'KRW' || quote?.symbol !== symbol
    || ![quote.price, quote.changePercent, quote.volume, quote.fetchedAt].every(Number.isFinite)
    || quote.price <= 0 || quote.volume < 0 || quote.fetchedAt > now + 60_000 || quote.fetchedAt < now - 120_000
    || !Array.isArray(data.candles) || data.candles.length > 100 || !(data.historyError === null || typeof data.historyError === 'string')) throw new StockDataError('invalid_response')
  let previous = 0
  for (const candle of data.candles) {
    if (![candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)
      || candle.timestamp <= previous || candle.timestamp > now + 9 * 3_600_000 || candle.low <= 0 || candle.high < Math.max(candle.open, candle.close, candle.low)
      || candle.low > Math.min(candle.open, candle.close) || candle.volume < 0) throw new StockDataError('invalid_response')
    previous = candle.timestamp
  }
  return data
}

/** One shared request per symbol; never poll the entire stock directory. */
export function createStockLoader(fetchImpl: typeof fetch = fetch, base = stockRelayBase(), now = Date.now) {
  const cache = new Map<string, { data: StockSnapshot; at: number }>()
  const pending = new Map<string, Promise<StockSnapshot>>()
  const failures = new Map<string, { error: StockDataError; until: number }>()
  let globalFailure: { error: StockDataError; until: number } | null = null
  let active = 0
  const waiting: (() => void)[] = []
  const enter = (signal: AbortSignal) => active < 2 ? (active++, Promise.resolve()) : new Promise<void>((resolve, reject) => {
    const start = () => { signal.removeEventListener('abort', abort); resolve() }
    const abort = () => { const index = waiting.indexOf(start); if (index >= 0) waiting.splice(index, 1); reject(new StockDataError('stock_unavailable')) }
    waiting.push(start); signal.addEventListener('abort', abort, { once: true })
  })
  const leave = () => { const next = waiting.shift(); if (next) next(); else active-- }
  return (symbol: string): Promise<StockSnapshot> => {
    if (!/^\d{6}$/.test(symbol)) return Promise.reject(new StockDataError('invalid_symbol'))
    if (base === null) return Promise.reject(new StockDataError('stock_setup_required', 300))
    const hit = cache.get(symbol)
    if (hit && now() - hit.at < 30_000 && now() - hit.data.quote.fetchedAt < 120_000) return Promise.resolve(hit.data)
    const failed = failures.get(symbol)
    if (globalFailure && globalFailure.until > now()) return Promise.reject(globalFailure.error)
    if (failed && failed.until > now()) return Promise.reject(failed.error)
    if (pending.has(symbol)) return pending.get(symbol)!
    if (pending.size >= 12) return Promise.reject(new StockDataError('stock_busy'))
    const signal = AbortSignal.timeout(20_000)
    const work = (async () => {
      await enter(signal)
      try {
        if (globalFailure && globalFailure.until > now()) throw globalFailure.error
        signal.throwIfAborted()
        const response = await fetchImpl(`${base}/api/stocks/snapshot?symbol=${symbol}`, { signal, credentials: 'omit', cache: 'no-store', redirect: 'error' })
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          const seconds = Number(response.headers.get('retry-after'))
          const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 300) : 30
          const error = new StockDataError(typeof body?.error === 'string' ? body.error : 'stock_unavailable', retryAfter)
          if (response.status === 429 || ['stock_setup_required', 'stock_public_disabled'].includes(error.code)) globalFailure = { error, until: now() + retryAfter * 1000 }
          throw error
        }
        const data = validateStockSnapshot(await response.json(), symbol, now())
        cache.delete(symbol); cache.set(symbol, { data, at: now() })
        while (cache.size > 100) cache.delete(cache.keys().next().value!)
        failures.delete(symbol)
        return data
      } catch (error) {
        const failure = error instanceof StockDataError ? error : new StockDataError('stock_unavailable')
        failures.set(symbol, { error: failure, until: now() + failure.retryAfter * 1000 })
        while (failures.size > 100) failures.delete(failures.keys().next().value!)
        throw failure
      } finally { leave() }
    })().finally(() => pending.delete(symbol))
    pending.set(symbol, work); return work
  }
}
let loader: ReturnType<typeof createStockLoader> | undefined
export function loadStockSnapshot(symbol: string) { loader ??= createStockLoader(); return loader(symbol) }

export function stockTrend(candles: readonly Candle[], now = Date.now()) {
  // Daily rows use UTC midnight as a calendar-date label, not an intraday trade timestamp.
  const today = Math.floor((now + 9 * 3_600_000) / 86_400_000) * 86_400_000
  const completed = candles.filter(c => c.timestamp < today)
  const latest = completed.at(-1)
  if (!latest || completed.length < 20 || today - latest.timestamp > 10 * 86_400_000) return null
  const recent = completed.slice(-20)
  const average = recent.reduce((sum, candle) => sum + candle.close / 20, 0)
  return { direction: latest.close > average * 1.01 ? 'above' : latest.close < average * 0.99 ? 'below' : 'near', average, low: Math.min(...recent.map(c => c.low)), high: Math.max(...recent.map(c => c.high)), asOf: latest.timestamp, count: completed.length }
}
export function stockValuation(average: number, quantity: number, price: number) {
  if (![average, quantity, price].every(n => Number.isFinite(n) && n > 0) || !Number.isSafeInteger(quantity)) return null
  const cost = average * quantity, value = price * quantity, profit = value - cost, percent = (price / average - 1) * 100
  return [cost, value, profit, percent].every(Number.isFinite) ? { cost, value, profit, percent } : null
}
