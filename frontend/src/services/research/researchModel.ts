import type { Candle } from '@/types/marketDetail'

export const researchAssets = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'LINK', 'LTC', 'TRX', 'DOT', 'NEAR', 'APT', 'ARB', 'OP', 'SUI', 'BCH', 'ATOM', 'UNI', 'AAVE', 'INJ', 'TIA'] as const
export interface ResearchSource { status: 'available' | 'unavailable'; source: string; receivedAt?: number; serverTime?: number; ageMs?: number; data: unknown }
export interface ResearchSnapshot { version: 1; asset: string; symbol: string; fetchedAt: number; sources: Record<string, ResearchSource> }
export const numeric = (value: unknown): number | null => value !== null && (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : []
/** Provider Date + HTTP Age + elapsed receipt time; robust to a skewed PC clock. */
export function providerNow(snapshot: ResearchSnapshot | null, key: string, now: number): number {
  const source = snapshot?.sources[key]
  return source && typeof source.serverTime === 'number' && Number.isFinite(source.serverTime) && typeof source.receivedAt === 'number'
    ? source.serverTime + Math.max(0, source.ageMs ?? 0) + Math.max(0, now - source.receivedAt) : now
}
export function sourceData(snapshot: ResearchSnapshot | null, key: string, now = Date.now()): unknown {
  const source = snapshot?.sources[key]
  const age = now - (source?.receivedAt ?? 0)
  if (source?.status !== 'available' || age < 0 || age > (['global', 'sentiment'].includes(key) ? 1_200_000 : 180_000)) return null
  const data = source.data
  const clock = providerNow(snapshot, key, now)
  const providerAt = ['mark', 'interest'].includes(key) ? numeric(object(data).time)
    : ['spot', 'futures'].includes(key) ? numeric(object(data).closeTime)
      : ['ratios', 'taker', 'interestHistory'].includes(key) ? numeric(object(array(data).at(-1)).timestamp) : undefined
  if (providerAt !== undefined && (providerAt === null || clock - providerAt < -5000 || clock - providerAt > (['ratios', 'taker', 'interestHistory'].includes(key) ? 7_200_000 : 180_000))) return null
  if (key === 'candles') {
    const latest = closedCandles(data, clock).at(-1)
    if (!latest || clock - latest.timestamp > 7_200_000) return null
  }
  return data
}
export function observedFundingInterval(snapshot: ResearchSnapshot | null, now: number): number | null {
  const info = array(sourceData(snapshot, 'fundingInfo', now)).map(object).find(row => row.symbol === snapshot?.symbol)
  const specified = numeric(info?.fundingIntervalHours)
  if (specified !== null && specified > 0 && specified <= 24) return specified
  const history = array(sourceData(snapshot, 'fundingHistory', now)).slice(-4).map(row => numeric(object(row).fundingTime))
  if (history.length < 4 || history.some(t => t === null)) return null
  const clock = providerNow(snapshot, 'fundingHistory', now)
  if (clock - history.at(-1)! < 0 || clock - history.at(-1)! > 86_400_000) return null
  const intervals = history.slice(1).map((t, i) => (t! - history[i]!) / 3_600_000)
  return intervals[0]! > 0 && intervals[0]! <= 24 && intervals.every(v => v === intervals[0]) ? intervals[0]! : null
}
export function feeBudget(input: { notional: number; makerPercent: number; takerPercent: number; entryMaker: boolean; exitMaker: boolean; monthlyTrips: number; targetPercent: number; stopPercent: number }) {
  const { notional, makerPercent, takerPercent, entryMaker, exitMaker, monthlyTrips, targetPercent, stopPercent } = input
  if (![notional, makerPercent, takerPercent, monthlyTrips, targetPercent, stopPercent].every(Number.isFinite) || notional <= 0 || Math.min(makerPercent, takerPercent, monthlyTrips) < 0 || targetPercent <= 0 || stopPercent <= 0) return null
  const roundTripPercent = (entryMaker ? makerPercent : takerPercent) + (exitMaker ? makerPercent : takerPercent)
  const perTrip = notional * roundTripPercent / 100
  return { perTrip, monthly: perTrip * monthlyTrips, annual: perTrip * monthlyTrips * 12, breakevenPercent: (stopPercent + roundTripPercent) / (targetPercent + stopPercent) * 100 }
}
export function closedCandles(data: unknown, now: number): Candle[] {
  const seen = new Set<number>()
  return array(data).flatMap(value => {
    if (!Array.isArray(value)) return []
    const [timestamp, open, high, low, close, volume, end] = [0, 1, 2, 3, 4, 5, 6].map(i => numeric(value[i]))
    if (timestamp === null || end === null || timestamp < 0 || end < timestamp || end >= now || seen.has(timestamp)
      || open === null || high === null || low === null || close === null || volume === null
      || Math.min(open, high, low, close) <= 0 || volume < 0 || low > Math.min(open, close) || high < Math.max(open, close)) return []
    seen.add(timestamp)
    return [{ timestamp, open, high, low, close, volume }]
  }).sort((a, b) => a.timestamp - b.timestamp)
}
export type Signal = 'rsiLow' | 'rsiHigh' | 'aboveMean' | 'belowMean' | 'volumeExpansion'
export const signalLabels: Record<Signal, string> = { rsiLow: 'RSI 30 이하', rsiHigh: 'RSI 70 이상', aboveMean: '20봉 평균 위', belowMean: '20봉 평균 아래', volumeExpansion: '거래량 평균의 1.5배 이상' }
export function candleSignals(candles: readonly Candle[], index: number): Signal[] {
  if (index < 20 || index >= candles.length) return []
  const history = candles.slice(index - 20, index)
  if (candles.slice(index - 20, index + 1).some((c, i, all) => i > 0 && c.timestamp - all[i - 1]!.timestamp !== 3_600_000)) return []
  const mean = history.reduce((sum, c) => sum + c.close, 0) / 20
  const volume = history.reduce((sum, c) => sum + c.volume, 0) / 20
  let up = 0, down = 0
  for (let i = index - 13; i <= index; i++) { const delta = candles[i]!.close - candles[i - 1]!.close; up += Math.max(0, delta); down += Math.max(0, -delta) }
  const rsi = up + down === 0 ? 50 : 100 * up / (up + down)
  const current = candles[index]!
  const signals: Signal[] = []
  if (rsi <= 30) signals.push('rsiLow')
  if (rsi >= 70) signals.push('rsiHigh')
  if (current.close > mean) signals.push('aboveMean')
  if (current.close < mean) signals.push('belowMean')
  if (volume > 0 && current.volume >= volume * 1.5) signals.push('volumeExpansion')
  return signals
}
export interface BacktestOptions { signals: readonly Signal[]; horizon: number; targetPercent: number; side: 'long' | 'short'; roundTripCostPercent: number }
export function backtest(candles: readonly Candle[], options: BacktestOptions) {
  let up = 0, down = 0, timeout = 0, ambiguous = 0, netSum = 0
  const { signals, horizon, targetPercent, side, roundTripCostPercent } = options
  if (!signals.length || !Number.isInteger(horizon) || horizon < 1 || horizon > 168 || !Number.isFinite(targetPercent) || targetPercent <= 0 || targetPercent >= 100 || !Number.isFinite(roundTripCostPercent) || roundTripCostPercent < 0) return null
  const splits = [0, 0]
  for (let i = 20; i + horizon < candles.length; i++) {
    if (!signals.every(signal => candleSignals(candles, i).includes(signal))) continue
    const future = candles.slice(i + 1, i + horizon + 1)
    if (future.some((c, j) => c.timestamp - (j ? future[j - 1]!.timestamp : candles[i]!.timestamp) !== 3_600_000)) continue
    // Signal is known at close; entry is next candle open, never the signal close.
    const entry = future[0]!.open, upper = entry * (1 + targetPercent / 100), lower = entry * (1 - targetPercent / 100)
    let result: 'up' | 'down' | 'timeout' | 'ambiguous' = 'timeout', exit = future.at(-1)!.close
    for (const candle of future) {
      if (candle.open >= upper) { result = 'up'; exit = candle.open; break }
      if (candle.open <= lower) { result = 'down'; exit = candle.open; break }
      const u = candle.high >= upper, d = candle.low <= lower
      if (u && d) { result = 'ambiguous'; break }
      if (u || d) { result = u ? 'up' : 'down'; exit = u ? upper : lower; break }
    }
    if (result === 'ambiguous') ambiguous++
    else {
      if (result === 'up') up++; else if (result === 'down') down++; else timeout++
      netSum += (exit / entry - 1) * 100 * (side === 'long' ? 1 : -1) - roundTripCostPercent
      splits[i < candles.length / 2 ? 0 : 1]!++
    }
    i += horizon - 1 // Non-overlapping holding windows.
  }
  const samples = up + down + timeout
  const hits = side === 'long' ? up : down
  const proportion = samples ? hits / samples : null
  // Wilson 95% interval: includes timeouts as non-hits, ambiguous bars excluded.
  const z = 1.96, denominator = 1 + z * z / Math.max(1, samples)
  const center = proportion === null ? 0 : (proportion + z * z / (2 * samples)) / denominator
  const half = proportion === null ? 0 : z * Math.sqrt(proportion * (1 - proportion) / samples + z * z / (4 * samples * samples)) / denominator
  return { up, down, timeout, ambiguous, samples, proportion, interval: proportion === null ? null : [Math.max(0, center - half), Math.min(1, center + half)], meanNetPercent: samples ? netSum / samples : null, splits }
}
export interface PositionInput { side: 'long' | 'short'; entry: number; mark: number; margin: number; leverage: number; maintenancePercent: number; feePercent: number; fundingPercent: number; fundingIntervalHours: number; hours: number }
export function positionRisk(input: PositionInput) {
  const { side, entry, mark, margin, leverage, maintenancePercent, feePercent, fundingPercent, fundingIntervalHours, hours } = input
  if (!Object.values(input).every(v => typeof v !== 'number' || Number.isFinite(v)) || Math.min(entry, mark, margin) <= 0 || leverage < 1 || leverage > 125 || maintenancePercent < 0 || maintenancePercent >= 100 / leverage || feePercent < 0 || feePercent > 10 || fundingIntervalHours <= 0 || hours < 0 || hours > 8760) return null
  const sign = side === 'long' ? 1 : -1, notional = margin * leverage, quantity = notional / entry
  const pnl = sign * quantity * (mark - entry)
  const fees = (notional + quantity * mark) * feePercent / 100
  const funding = quantity * mark * fundingPercent / 100 * (hours / fundingIntervalHours) * sign
  // Linear isolated contract, constant MMR, no maintenance deduction, added margin or liquidation fee.
  const mmr = maintenancePercent / 100
  const liquidation = side === 'long' ? entry * (1 - 1 / leverage) / (1 - mmr) : entry * (1 + 1 / leverage) / (1 + mmr)
  return { notional, quantity, pnl, fees, funding, net: pnl - fees - funding, roe: pnl / margin * 100, liquidation, distancePercent: sign * (mark - liquidation) / mark * 100, equity: margin + pnl - fees - funding }
}
export function kimchiPremium(krw: number, usdt: number, usdtKrw: number) {
  return [krw, usdt, usdtKrw].every(n => Number.isFinite(n) && n > 0) ? (krw / (usdt * usdtKrw) - 1) * 100 : null
}
export function percentile(values: readonly number[], current: number) {
  const finite = values.filter(Number.isFinite)
  return finite.length >= 20 && Number.isFinite(current) ? finite.filter(n => n <= current).length / finite.length * 100 : null
}
export function volatilitySummary(candles: readonly Candle[]) {
  const recent = candles.slice(-25)
  if (recent.length < 25 || recent.some((c, i) => i > 0 && c.timestamp - recent[i - 1]!.timestamp !== 3_600_000)) return null
  const returns = recent.slice(1).map((c, i) => Math.log(c.close / recent[i]!.close))
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const hourly = Math.sqrt(returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1)) * 100
  return { hourly, daily: hourly * Math.sqrt(24), samples: returns.length }
}
