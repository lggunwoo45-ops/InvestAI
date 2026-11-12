import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { seriesMarketTime, type AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { validHistoryCandle, type DailyHistory } from '@/services/market/providers/dailyHistory'

const DAY = 86_400_000, WEEK = DAY * 7
const mean = (a: readonly number[]) => a.reduce((s, n) => s + n, 0) / a.length
const median = (a: readonly number[]) => { const sorted = [...a].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] }
export interface SupportCandidate {
  center: number; low: number; high: number; score: number; reactions: number; weeklyPivots: number
  averages: string[]; volumeReactions: number; medianRebound: number; firstReaction: number; lastReaction: number
}
export interface MajorSupport {
  status: 'ready' | 'data' | 'history' | 'no-confluence'
  candidates: SupportCandidate[]; price: number | null; days: number; weeks: number
  from: number | null; asOf: number | null; atr: number | null
}
interface Pivot { price: number; at: number; weekly: boolean; rebound: number; volumeRatio: number }

/** Only complete UTC Monday-Sunday weeks. Missing days are never forward-filled. */
function weeklyBars(days: readonly Candle[]): Candle[] {
  const groups = new Map<number, Candle[]>()
  for (const c of days) {
    const key = Math.floor((c.timestamp - 4 * DAY) / WEEK) * WEEK + 4 * DAY
    const group = groups.get(key) ?? []; group.push(c); groups.set(key, group)
  }
  return [...groups.entries()].filter(([key, rows]) => rows.length === 7 && rows.every((c, i) => c.timestamp === key + i * DAY))
    .map(([timestamp, rows]) => ({ timestamp, open: rows[0].open, close: rows[6].close, low: Math.min(...rows.map(c => c.low)), high: Math.max(...rows.map(c => c.high)), volume: rows.reduce((s, c) => s + c.volume, 0) }))
}

function pivots(rows: readonly Candle[], weekly: boolean): Pivot[] {
  const radius = weekly ? 2 : 3, result: Pivot[] = []
  for (let i = radius; i < rows.length - radius; i++) {
    const c = rows[i], nearby = rows.slice(i - radius, i + radius + 1)
    const interval = weekly ? WEEK : DAY
    if (nearby.some((v, j) => j && v.timestamp - nearby[j - 1].timestamp !== interval)) continue
    if (nearby.some(v => v.low < c.low) || !nearby.some(v => v.low > c.low)) continue
    const following = rows.slice(i + 1, i + (weekly ? 3 : 11))
    const peak = following.reduce((best, v) => v.close > best.close ? v : best, following[0])
    const rebound = (peak.close / c.low - 1) * 100
    if (rebound < 3) continue
    const volumes = rows.slice(Math.max(0, i - 20), i).map(v => v.volume)
    const baseline = mean(volumes)
    result.push({ price: c.low, at: c.timestamp, weekly, rebound, volumeRatio: baseline > 0 ? peak.volume / baseline : 0 })
  }
  return result
}

/** Evidence ranking, not a fitted probability or a prediction of the next market bottom. */
export function buildMajorSupport(instrument: MarketInstrument, history: DailyHistory | null, quote: AnalysisSeries, now: number): MajorSupport {
  const result: MajorSupport = { status: 'data', candidates: [], price: null, days: 0, weeks: 0, from: null, asOf: null, atr: null }
  if (!history || history.instrumentId !== instrument.id || history.marketId !== instrument.marketId || history.currency !== instrument.quoteCurrency
    || quote.dataQuality !== 'live' || quote.connectionStatus !== 'live' || !quote.currentPrice || !Number.isFinite(quote.currentPrice) || quote.currentPrice <= 0
    || !quote.updatedAt || now - quote.updatedAt > 90_000 || quote.updatedAt > now + 60_000
    || !Number.isFinite(history.fetchedAt) || history.fetchedAt > now + 60_000 || now - history.fetchedAt > 1_800_000) return result
  const marketNow = seriesMarketTime(quote, now)
  if (history.candles.some(c => !validHistoryCandle(c)) || new Set(history.candles.map(c => c.timestamp)).size !== history.candles.length) return result
  const days = history.candles.filter(c => c.timestamp + DAY <= Math.min(marketNow, history.fetchedAt)).toSorted((a, b) => a.timestamp - b.timestamp).slice(-800)
  const weeks = weeklyBars(days), last = days.at(-1)
  Object.assign(result, { status: 'history', days: days.length, weeks: weeks.length, from: days[0]?.timestamp ?? null, asOf: last ? last.timestamp + DAY : null })
  if (days.length < 180 || weeks.length < 24 || !last || marketNow - (last.timestamp + DAY) > DAY * 1.5) return result
  const expected = (last.timestamp - days[0].timestamp) / DAY + 1
  if (days.length / expected < .95 || days.slice(-30).some((c, i, a) => i > 0 && c.timestamp - a[i - 1].timestamp !== DAY)) return result
  const ranges = days.slice(-15).slice(1).map((c, i) => { const prev = days.slice(-15)[i]; return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)) })
  const atr = mean(ranges), price = quote.currentPrice
  Object.assign(result, { status: 'no-confluence', price, atr })
  if (!Number.isFinite(atr) || atr <= 0) return result
  const halfWidth = (center: number) => Math.min(center * .02, Math.max(center * .006, atr * .3))
  const all = [...pivots(days, false), ...pivots(weeks, true)].filter(p => p.price < price).sort((a, b) => a.price - b.price)
  const groups: Pivot[][] = []
  for (const p of all) {
    const group = groups.at(-1)
    if (group && Math.abs(p.price - median(group.map(v => v.price))) <= halfWidth(median(group.map(v => v.price)))) group.push(p)
    else groups.push([p])
  }
  const averages = [
    ...(days.length >= 200 ? [{ label: '200D', value: mean(days.slice(-200).map(c => c.close)) }] : []),
    { label: '20W', value: mean(weeks.slice(-20).map(c => c.close)) },
    ...(weeks.length >= 50 ? [{ label: '50W', value: mean(weeks.slice(-50).map(c => c.close)) }] : []),
  ]
  result.candidates = groups.flatMap(group => {
    const center = median(group.flatMap(p => p.weekly ? [p.price, p.price] : [p.price]))
    const low = center - halfWidth(center), high = center + halfWidth(center)
    if (price < low || days.slice(-2).every(c => c.close < low)) return []
    const events: Pivot[] = []
    for (const p of [...group].sort((a, b) => a.at - b.at)) {
      if (!events.length || p.at - events.at(-1)!.at >= 14 * DAY) events.push(p)
    }
    if (events.length < 2 || events.at(-1)!.at - events[0].at < 28 * DAY) return []
    const weeklyPivots = new Set(group.filter(p => p.weekly).map(p => p.at)).size
    const overlaps = averages.filter(a => a.value >= low && a.value <= high).map(a => a.label)
    const volumeReactions = events.filter(p => p.volumeRatio >= 1.2).length
    const medianRebound = median(events.map(p => p.rebound))
    const score = Math.min(100, Math.min(events.length, 4) * 8 + Math.min(weeklyPivots, 2) * 15 + Math.min(overlaps.length, 2) * 10
      + Math.min(volumeReactions, 2) * 4 + Math.min(10, Math.floor(medianRebound)) )
    if (score < 30 || (!weeklyPivots && !overlaps.length && events.length < 3)) return []
    return [{ center, low, high, score, reactions: events.length, weeklyPivots, averages: overlaps, volumeReactions, medianRebound, firstReaction: events[0].at, lastReaction: events.at(-1)!.at }]
  }).sort((a, b) => b.score - a.score || b.weeklyPivots - a.weeklyPivots || b.lastReaction - a.lastReaction).slice(0, 4)
  if (result.candidates.length) result.status = 'ready'
  return result
}
