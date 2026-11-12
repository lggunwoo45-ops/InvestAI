import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { fetchJson } from './providerUtils'

export interface DailyHistory { instrumentId: string; marketId: string; currency: string; fetchedAt: number; candles: readonly Candle[] }
interface UpbitDay { market: string; candle_date_time_utc: string; opening_price: number; high_price: number; low_price: number; trade_price: number; candle_acc_trade_volume: number }
export function validHistoryCandle(c: Candle) {
  return Number.isFinite(c.timestamp) && c.timestamp > 0 && c.timestamp % 86_400_000 === 0
    && [c.open, c.high, c.low, c.close].every(v => Number.isFinite(v) && v > 0)
    && c.high >= Math.max(c.open, c.close, c.low) && c.low <= Math.min(c.open, c.close)
    && Number.isFinite(c.volume) && c.volume >= 0
}
/** Bounded public daily history. Same provider and quote currency as the selected asset. */
export async function loadCryptoDailyHistory(instrument: MarketInstrument, signal: AbortSignal): Promise<readonly Candle[]> {
  signal.throwIfAborted()
  const result: Candle[] = []
  if (instrument.marketId === 'upbit') {
    const [asset, quote] = instrument.symbol.split('/')
    const market = instrument.providerSymbol ?? `${quote}-${asset}`.toUpperCase()
    if (!/^(KRW|BTC|USDT)-[A-Z0-9]{1,20}$/.test(market) || !market.startsWith(`${instrument.quoteCurrency}-`)) throw new Error('history-identity')
    let before = Infinity
    for (let page = 0; page < 4; page++) {
      const cursor = Number.isFinite(before) ? `&to=${encodeURIComponent(new Date(before).toISOString().replace('.000Z', 'Z'))}` : ''
      const rows = await fetchJson<UpbitDay[]>(`https://api.upbit.com/v1/candles/days?market=${market}&count=200${cursor}`, signal, () => 2)
      signal.throwIfAborted()
      if (!Array.isArray(rows) || rows.length > 200) throw new Error('history-response')
      if (!rows.length) break
      const candles = rows.map(row => {
        if (row.market !== market) throw new Error('history-identity')
        return { timestamp: Date.parse(`${row.candle_date_time_utc}Z`), open: row.opening_price, high: row.high_price, low: row.low_price, close: row.trade_price, volume: row.candle_acc_trade_volume }
      })
      if (candles.some(c => !validHistoryCandle(c) || c.timestamp >= before)) throw new Error('history-cursor')
      result.push(...candles); before = Math.min(...candles.map(c => c.timestamp))
      if (rows.length < 200) break
    }
  } else if (instrument.marketId === 'binance-spot' || instrument.marketId === 'binance-futures') {
    const symbol = (instrument.providerSymbol ?? instrument.symbol.replace('/', '')).toUpperCase()
    if (!/^[A-Z0-9]{3,30}$/.test(symbol) || !symbol.endsWith(instrument.quoteCurrency)) throw new Error('history-identity')
    const base = instrument.marketId === 'binance-spot' ? 'https://data-api.binance.vision/api/v3' : 'https://fapi.binance.com/fapi/v1'
    const rows = await fetchJson<unknown[][]>(`${base}/klines?symbol=${symbol}&interval=1d&limit=800`, AbortSignal.any([signal, AbortSignal.timeout(12_000)]))
    signal.throwIfAborted()
    if (!Array.isArray(rows) || rows.length > 800) throw new Error('history-response')
    result.push(...rows.map(c => ({ timestamp: Number(c[0]), open: Number(c[1]), high: Number(c[2]), low: Number(c[3]), close: Number(c[4]), volume: Number(c[5]) })))
  } else throw new Error('history-unsupported')
  if (result.some(c => !validHistoryCandle(c)) || new Set(result.map(c => c.timestamp)).size !== result.length) throw new Error('history-invalid')
  return result.sort((a, b) => a.timestamp - b.timestamp)
}
