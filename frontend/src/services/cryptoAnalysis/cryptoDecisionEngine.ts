import type { Candle, RecentTrade } from '@/types/marketDetail'
import type { AnalysisDataQuality } from '@/types/myAnalysis'

export const analysisIntervals = { '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000 } as const
export type AnalysisFrame = keyof typeof analysisIntervals
export interface AnalysisSeries {
  candles: readonly Candle[]
  dataQuality: AnalysisDataQuality
  currentPrice: number | null
  connectionStatus: string
  updatedAt?: number | null
  marketTime?: number
  recentTrades?: readonly RecentTrade[]
}
export type Direction = 'buy' | 'neutral' | 'sell'
export type SeriesIssue = 'loading' | 'mock' | 'disconnected' | 'stale' | 'history' | 'gaps' | 'range'
export interface FrameRead {
  gap?: { from: number; to: number; missing: number }
  frame: AnalysisFrame
  issue: SeriesIssue | null
  count: number
  asOf: number | null
  direction: Direction
  close: number | null
  sma20: number | null
  sma50: number | null
  rsi: number | null
  atr: number | null
  volumeRatio: number | null
  candles: readonly Candle[]
}
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const average = (values: readonly number[]) => values.reduce((sum, n) => sum + n, 0) / values.length
const validCandle = (c: Candle) => Number.isFinite(c.timestamp) && c.timestamp > 0 && [c.open, c.high, c.low, c.close].every(positive)
  && Number.isFinite(c.volume) && c.volume >= 0 && c.high >= Math.max(c.open, c.close, c.low) && c.low <= Math.min(c.open, c.close, c.high)

export function seriesMarketTime(series: AnalysisSeries, now: number): number {
  return positive(series.marketTime) && positive(series.updatedAt)
    ? series.marketTime + Math.max(0, now - series.updatedAt) : now
}

/** Wilder smoothing, with a full 14-change seed. A flat series is neutral, not overbought. */
export function wilderRsi(closes: readonly number[], period = 14): number | null {
  if (closes.length <= period || !closes.every(positive)) return null
  const changes = closes.slice(1).map((v, i) => v - closes[i])
  let gains = average(changes.slice(0, period).map(n => Math.max(n, 0)))
  let losses = average(changes.slice(0, period).map(n => Math.max(-n, 0)))
  for (const n of changes.slice(period)) { gains = (gains * (period - 1) + Math.max(n, 0)) / period; losses = (losses * (period - 1) + Math.max(-n, 0)) / period }
  const result = gains === 0 && losses === 0 ? 50 : losses === 0 ? 100 : 100 - 100 / (1 + gains / losses)
  return Number.isFinite(result) ? result : null
}

export function readFrame(frame: AnalysisFrame, series: AnalysisSeries, now: number): FrameRead {
  const interval = analysisIntervals[frame]
  const marketNow = seriesMarketTime(series, now)
  const unique = new Map<number, Candle>()
  for (const c of series.candles) if (validCandle(c) && c.timestamp + interval <= marketNow) unique.set(c.timestamp, c)
  const candles = [...unique.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-120)
  const last = candles.at(-1)
  const empty: FrameRead = { frame, issue: null, count: candles.length, asOf: last ? last.timestamp + interval : null, direction: 'neutral', close: null, sma20: null, sma50: null, rsi: null, atr: null, volumeRatio: null, candles: [] }
  let issue: SeriesIssue | null = null
  if (series.dataQuality === 'mock') issue = 'mock'
  else if (['reconnecting', 'disconnected', 'unsupported'].includes(series.connectionStatus)) issue = 'disconnected'
  else if (series.dataQuality !== 'live' || ['idle', 'connecting'].includes(series.connectionStatus)) issue = 'loading'
  else if (series.connectionStatus !== 'live') issue = 'disconnected'
  else if (!positive(series.updatedAt) || now - series.updatedAt > 90_000 || series.updatedAt > now + 60_000) issue = 'stale'
  else if (candles.length < 50) issue = 'history'
  else if (!last || marketNow - (last.timestamp + interval) > interval * 1.5) issue = 'stale'
  // Missing intervals must not silently turn an observation count into a time period.
  else if (candles.slice(-50).some((c, i, rows) => i > 0 && c.timestamp - rows[i - 1].timestamp !== interval)) issue = 'gaps'
  if (issue) {
    const rows = candles.slice(-50)
    const index = issue === 'gaps' ? rows.findIndex((c, i) => i > 0 && c.timestamp - rows[i - 1].timestamp !== interval) : -1
    return { ...empty, issue, ...(index > 0 ? { gap: { from: rows[index - 1].timestamp + interval, to: rows[index].timestamp, missing: Math.max(0, Math.ceil((rows[index].timestamp - rows[index - 1].timestamp) / interval) - 1) } } : {}) }
  }
  const closes = candles.map(c => c.close)
  const sma20 = average(closes.slice(-20)), sma50 = average(closes.slice(-50))
  const rsi = wilderRsi(closes)
  const ranges = candles.slice(1).map((c, i) => Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close)))
  let atr = average(ranges.slice(0, 14))
  for (const range of ranges.slice(14)) atr = (atr * 13 + range) / 14
  const baseline = average(candles.slice(-21, -1).map(c => c.volume))
  const volumeRatio = baseline > 0 ? last!.volume / baseline : null
  if (![sma20, sma50, atr, rsi].every(n => n !== null && Number.isFinite(n)) || !positive(atr) || (volumeRatio !== null && !Number.isFinite(volumeRatio))) return { ...empty, issue: 'range' }
  const close = last!.close
  // Deadband avoids directional labels for essentially flat prices.
  const margin = atr * 0.1
  const direction: Direction = close > sma20 + margin && sma20 > sma50 + margin ? 'buy' : close < sma20 - margin && sma20 < sma50 - margin ? 'sell' : 'neutral'
  return { ...empty, close, sma20, sma50, rsi, atr, volumeRatio, direction, candles }
}

export interface PricePlan {
  frame: AnalysisFrame
  entry: readonly [number, number]
  resistance: readonly [number, number]
  stop: number
  sellInvalidation: number
  target: number
  targetBasis: 'observed' | 'atr'
  supportBasis: 'pivot' | 'range'
  rewardRisk: number
}
function pricePlan(read: FrameRead, price: number): PricePlan | null {
  if (read.issue || !positive(read.atr)) return null
  const atr = read.atr, candles = read.candles.slice(-60)
  const lows: number[] = [], highs: number[] = []
  for (let i = 2; i < candles.length - 2; i++) {
    const row = candles[i], neighbours = [candles[i - 2], candles[i - 1], candles[i + 1], candles[i + 2]]
    if (neighbours.every(c => row.low < c.low)) lows.push(row.low)
    if (neighbours.every(c => row.high > c.high)) highs.push(row.high)
  }
  const pivot = lows.filter(n => n < price).sort((a, b) => b - a)[0]
  const support = pivot ?? Math.max(...candles.slice(-20).map(c => c.low).filter(n => n < price))
  if (!positive(support)) return null
  const entry: [number, number] = [support - atr * 0.25, Math.min(price, support + atr * 0.25)]
  const stop = support - atr
  const center = average(entry)
  // A resistance band must sit above the entry band, even when price is near support.
  const minimumResistance = Math.max(price, entry[1] + atr * 0.25)
  const observed = highs.filter(n => n > minimumResistance).sort((a, b) => a - b)[0]
    ?? Math.min(...candles.slice(-20).map(c => c.high).filter(n => n > minimumResistance))
  const target = positive(observed) ? observed : Math.max(price, center) + atr * 2
  const resistance: [number, number] = [target - atr * 0.25, target + atr * 0.25]
  const rewardRisk = (target - center) / (center - stop)
  const sellInvalidation = target + atr * 0.5
  if (![...entry, ...resistance, stop, target, sellInvalidation, rewardRisk].every(positive) || entry[0] > entry[1] || stop >= entry[0] || resistance[0] <= entry[1]) return null
  return { frame: read.frame, entry, resistance, stop, sellInvalidation, target, targetBasis: positive(observed) ? 'observed' : 'atr', supportBasis: pivot ? 'pivot' : 'range', rewardRisk }
}

export interface CryptoDecision {
  direction: Direction | 'unavailable'
  frames: readonly FrameRead[]
  price: number | null
  coverage: number
  plan: PricePlan | null
  action: 'pullback' | 'entry' | 'reduce' | 'wait' | 'refresh' | 'poorReward'
  extended: boolean
  mixed: boolean
}
export function buildCryptoDecision(series: Record<AnalysisFrame, AnalysisSeries>, now: number): CryptoDecision {
  const frames = (Object.keys(analysisIntervals) as AnalysisFrame[]).map(frame => readFrame(frame, series[frame], now))
  const usable = frames.filter(r => !r.issue)
  const price = (['1H', '4H', '1D'] as const).map(frame => series[frame]).find(s => s.dataQuality === 'live' && s.connectionStatus === 'live' && positive(s.updatedAt) && now - s.updatedAt <= 90_000 && s.updatedAt <= now + 60_000 && positive(s.currentPrice))?.currentPrice ?? null
  const weights = { '1H': 1, '4H': 2, '1D': 3 }
  const weighted = usable.reduce((sum, r) => sum + (r.direction === 'buy' ? 1 : r.direction === 'sell' ? -1 : 0) * weights[r.frame], 0)
  const total = usable.reduce((sum, r) => sum + weights[r.frame], 0)
  const direction = usable.length < 2 || !positive(price) ? 'unavailable' : weighted / total >= 0.5 ? 'buy' : weighted / total <= -0.5 ? 'sell' : 'neutral'
  const reference = usable.find(r => r.frame === '4H') ?? usable.find(r => r.frame === '1D') ?? usable[0]
  const plan = direction !== 'unavailable' && reference && positive(price) ? pricePlan(reference, price) : null
  const extended = usable.some(r => (r.rsi ?? 0) >= 70) || !!(reference && positive(price) && positive(reference.atr) && positive(reference.sma20) && price - reference.sma20 > reference.atr * 2)
  const action = direction === 'unavailable' ? 'refresh' : direction === 'sell' ? 'reduce' : direction === 'buy' && plan ? (extended || price! > plan.entry[1] ? 'pullback' : plan.rewardRisk < 1.5 ? 'poorReward' : 'entry') : 'wait'
  return { direction, frames, price, coverage: usable.length, plan, action, extended, mixed: new Set(usable.map(r => r.direction)).size > 1 }
}

/** Recent execution sample, NOT wallet identity, net inflows, or a complete time-window tape. */
export function tradeFlow(trades: readonly RecentTrade[], now: number) {
  const unique = new Map<string, RecentTrade>()
  for (const t of trades) if (t.id && positive(t.price) && positive(t.amount) && positive(t.price * t.amount) && ['buy', 'sell'].includes(t.side) && Number.isFinite(t.timestamp) && t.timestamp <= now + 5_000 && t.timestamp >= now - 300_000) unique.set(t.id, t)
  const sample = [...unique.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
  const sizes = sample.map(t => t.price * t.amount).sort((a, b) => a - b)
  const threshold = sample.length >= 10 ? Math.max(sizes[Math.floor(sizes.length * 0.75)], sizes[Math.floor(sizes.length / 2)] * 1.5) : null
  const large = threshold === null ? [] : sample.filter(t => t.price * t.amount >= threshold)
  const buy = large.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.price * t.amount, 0)
  const sell = large.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.price * t.amount, 0)
  const fresh = sample.length > 0 && now - sample[0].timestamp <= 60_000
  const ratio = large.length >= 3 && fresh && positive(buy + sell) ? buy / (buy + sell) : null
  const direction: Direction | 'unavailable' = ratio === null ? 'unavailable' : ratio >= 0.6 ? 'buy' : ratio <= 0.4 ? 'sell' : 'neutral'
  return { direction, ratio, threshold, count: sample.length, largeCount: large.length, buy, sell, from: sample.at(-1)?.timestamp ?? null, to: sample[0]?.timestamp ?? null }
}
