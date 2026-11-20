import { readFrame, seriesMarketTime, type AnalysisFrame, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { DailyHistory } from '@/services/market/providers/dailyHistory'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { buildMajorSupport, weeklyBars } from './majorSupport'

export type AnalysisHorizon = 'intraday' | 'position'
export const parseAnalysisHorizon = (value: string | null): AnalysisHorizon => value === 'position' ? 'position' : 'intraday'
export interface PathLevel {
  low: number; high: number; center: number; touches: number; frames: string[]; basis: 'pivot' | 'range' | 'confluence'
}
export interface ReboundPath {
  status: 'ready' | 'data' | 'history'; horizon: AnalysisHorizon; instrumentId: string; venue: string; currency: string
  price: number | null; support: PathLevel | null; first: PathLevel | null; target: PathLevel | null; invalidation: number | null
  upside: number | null; fromSupport: number | null; downside: number | null; asOf: number | null; receivedAt: number | null
  frame: '1H' | '1D'; bars: number; higherBars: number; atr: number | null; countertrend: boolean; nearFirst: boolean
  resistanceState: 'below' | 'rejected' | 'testing'; supportState: 'above' | 'testing'
}
type Source = { rows: readonly Candle[]; frame: string; weight: number }
type Point = { price: number; at: number; frame: string; weight: number }
const DAY = 86_400_000
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const median = (values: number[]) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]

function levels(sources: Source[], side: 'support' | 'resistance', atr: number, horizon: AnalysisHorizon): PathLevel[] {
  const points: Point[] = []
  for (const source of sources) {
    let last = -10
    for (let i = 2; i < source.rows.length - 2; i++) {
      const row = source.rows[i], nearby = source.rows.slice(i - 2, i + 3)
      const price = side === 'support' ? row.low : row.high
      const values = nearby.map(c => side === 'support' ? c.low : c.high)
      const interval = source.frame === '1W' ? DAY * 7 : source.frame === '1D' ? DAY : source.frame === '4H' ? 14_400_000 : 3_600_000
      if (nearby.some((c, j) => j > 0 && c.timestamp - nearby[j - 1].timestamp !== interval)) continue
      const pivot = side === 'support' ? values.every(v => v >= price) && values.some(v => v > price) : values.every(v => v <= price) && values.some(v => v < price)
      if (pivot && i - last >= 3) { points.push({ price, at: row.timestamp, frame: source.frame, weight: source.weight }); last = i }
    }
  }
  const width = (center: number) => Math.min(center * (horizon === 'intraday' ? .008 : .02), atr * .25)
  const groups: Point[][] = []
  for (const point of points.sort((a, b) => a.price - b.price)) {
    const last = groups.at(-1), center = last && median(last.map(p => p.price))
    if (last && center && point.price - center <= width(center)) last.push(point)
    else groups.push([point])
  }
  return groups.map(group => {
    const center = median(group.flatMap(p => Array.from({ length: p.weight }, () => p.price)))
    // A higher-timeframe pivot is overlapping evidence, not an independent extra touch.
    const times = [...new Set(group.map(p => p.at))].sort((a, b) => a - b), separated: number[] = []
    for (const at of times) if (!separated.length || at - separated.at(-1)! >= (horizon === 'intraday' ? 14_400_000 : DAY * 7)) separated.push(at)
    return { center, low: center - width(center), high: center + width(center), touches: separated.length, frames: [...new Set(group.map(p => p.frame))], basis: 'pivot' }
  })
}
const strength = (level: PathLevel) => Math.min(level.touches, 6) * 3 + level.frames.length * 2 + (level.basis === 'confluence' ? 20 : 0)

/** Conditional observed-price path. Neither a return forecast nor an entry signal. */
export function buildReboundPath(instrument: MarketInstrument, series: Record<AnalysisFrame, AnalysisSeries>, history: DailyHistory | null, horizon: AnalysisHorizon, now: number): ReboundPath {
  const result: ReboundPath = { status: 'data', horizon, instrumentId: instrument.id, venue: instrument.marketId, currency: instrument.quoteCurrency,
    price: null, support: null, first: null, target: null, invalidation: null, upside: null, fromSupport: null, downside: null, asOf: null, receivedAt: null,
    frame: horizon === 'intraday' ? '1H' : '1D', bars: 0, higherBars: 0, atr: null, countertrend: false, nearFirst: false, resistanceState: 'below', supportState: 'above' }
  if (!['upbit', 'binance-spot', 'binance-futures'].includes(instrument.marketId)) return result
  const fresh = (s: AnalysisSeries) => s.dataQuality === 'live' && s.connectionStatus === 'live' && positive(s.currentPrice) && positive(s.updatedAt) && now - s.updatedAt <= 90_000 && s.updatedAt <= now + 60_000
  const quote = [series['1H'], series['4H'], series['1D']].filter(fresh).sort((a, b) => b.updatedAt! - a.updatedAt!)[0]
  if (!quote) return result
  const price = quote.currentPrice!
  let sources: Source[], rows: readonly Candle[], atr: number
  if (horizon === 'intraday') {
    const hour = readFrame('1H', series['1H'], now), four = readFrame('4H', series['4H'], now)
    if (hour.issue || four.issue || !positive(hour.atr)) return { ...result, status: hour.issue === 'history' || four.issue === 'history' ? 'history' : 'data' }
    rows = hour.candles; atr = hour.atr
    sources = [{ rows, frame: '1H', weight: 1 }, { rows: four.candles, frame: '4H', weight: 2 }]
    Object.assign(result, { asOf: hour.asOf, bars: rows.length, higherBars: four.count, countertrend: four.direction === 'sell' })
  } else {
    const major = buildMajorSupport(instrument, history, quote, now)
    if (!['ready', 'no-confluence'].includes(major.status) || !positive(major.atr) || !history) return { ...result, status: major.status === 'history' ? 'history' : 'data' }
    rows = history.candles.filter(c => c.timestamp + DAY <= Math.min(seriesMarketTime(quote, now), history.fetchedAt)).toSorted((a, b) => a.timestamp - b.timestamp).slice(-800)
    const weeks = weeklyBars(rows); atr = major.atr
    sources = [{ rows, frame: '1D', weight: 1 }, { rows: weeks, frame: '1W', weight: 2 }]
    const mean20 = rows.slice(-20).reduce((s, c) => s + c.close, 0) / 20
    Object.assign(result, { asOf: major.asOf, bars: rows.length, higherBars: weeks.length, countertrend: rows.at(-1)!.close < mean20 })
    const main = major.candidates[0]
    if (main) result.support = { low: main.low, high: main.high, center: main.center, touches: main.reactions, frames: main.weeklyPivots ? ['1D', '1W'] : ['1D'], basis: 'confluence' }
  }
  const fallback = (side: 'support' | 'resistance'): PathLevel | null => {
    const value = side === 'support' ? Math.min(...rows.slice(-20).map(c => c.low)) : Math.max(...rows.map(c => c.high))
    if (side === 'support' ? value >= price : value <= price) return null
    const width = Math.min(value * .005, atr * .2)
    return { center: value, low: value - width, high: value + width, touches: 1, frames: [result.frame], basis: 'range' }
  }
  const supports = levels(sources, 'support', atr, horizon).filter(l => l.low < price && l.center < price && (horizon === 'position' || price - l.center <= atr * 6))
  result.support ??= supports.sort((a, b) => strength(b) - strength(a) || b.center - a.center)[0] ?? fallback('support')
  const resistances = levels(sources, 'resistance', atr, horizon).filter(l => l.center > price && (!result.support || l.low > result.support.high)).sort((a, b) => a.center - b.center)
  result.first = resistances[0] ?? fallback('resistance')
  if (result.first) {
    result.target = resistances.filter(l => l.low > result.first!.high + atr * .25).sort((a, b) => strength(b) - strength(a) || a.center - b.center)[0] ?? null
    const last = rows.at(-1)!
    result.resistanceState = last.high >= result.first.low && last.close < result.first.low ? 'rejected' : price >= result.first.low ? 'testing' : 'below'
    result.nearFirst = (result.first.center - price) / price * 100 < .5
  }
  if (result.support) {
    const invalidation = result.support.low - atr * (horizon === 'intraday' ? .5 : .75)
    result.invalidation = positive(invalidation) ? invalidation : null
    result.supportState = price <= result.support.high ? 'testing' : 'above'
  }
  result.upside = result.target ? (result.target.center / price - 1) * 100 : null
  result.fromSupport = result.target && result.support ? (result.target.center / result.support.center - 1) * 100 : null
  result.downside = result.invalidation ? (result.invalidation / price - 1) * 100 : null
  return { ...result, status: 'ready', price, receivedAt: quote.updatedAt!, atr }
}
