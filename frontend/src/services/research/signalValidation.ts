import { ENGINE_VERSION, DERIVATIVE_FILTER_VERSION, derivativeMatch, hasDerivativeFilters, matchesFrame, signalFrames, timeframes, validExplorerConfig, type Candle, type DerivativeContextPoint, type ExplorerConfig, type SignalFrame } from './signalExplorer'
import type { ResearchHistory } from './researchClient'

export const VALIDATION_VERSION = 'investai-signal-validation-1'
export interface ValidationCosts { fee: number; slippage: number; dailyHolding: number }
export interface ValidationTrade {
  signalAt: number; enteredAt: number; exitBarAt: number; observedThrough: number;
  entry: number; exitLow: number; exitHigh: number; outcome: 'up' | 'down' | 'timeout' | 'ambiguous';
  grossLow: number; grossHigh: number; netLow: number; netHigh: number;
}
export interface ValidationStats {
  samples: number; ambiguous: number; meanGrossLow: number | null; meanGrossHigh: number | null;
  meanNetLow: number | null; meanNetHigh: number | null; worstNet: number | null;
  positiveLow: number; positiveHigh: number;
}
export interface ValidationSegment {
  from: number; to: number; stats: ValidationStats; trades: ValidationTrade[];
  incomplete: number; gaps: number; unknown: number;
}
export interface SignalValidationReport {
  version: typeof VALIDATION_VERSION; signalVersion: string; derivativeVersion: string | null;
  input: { history: ResearchHistory; config: ExplorerConfig; costs: ValidationCosts; contexts?: DerivativeContextPoint[] };
  splitAt: number; splitPercent: 70; training: ValidationSegment; validation: ValidationSegment;
  periods: { from: number; to: number; stats: ValidationStats }[];
}

export function validValidationCosts(c: ValidationCosts): boolean {
  return !!c && [c.fee, c.slippage, c.dailyHolding].every(n => Number.isFinite(n) && n >= 0 && n <= 5)
}
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
function summarize(rows: ValidationTrade[]): ValidationStats {
  return { samples: rows.length, ambiguous: rows.filter(r => r.outcome === 'ambiguous').length,
    meanGrossLow: mean(rows.map(r => r.grossLow)), meanGrossHigh: mean(rows.map(r => r.grossHigh)),
    meanNetLow: mean(rows.map(r => r.netLow)), meanNetHigh: mean(rows.map(r => r.netHigh)),
    worstNet: rows.length ? Math.min(...rows.map(r => r.netLow)) : null,
    positiveLow: rows.filter(r => r.netLow > 0).length, positiveHigh: rows.filter(r => r.netHigh > 0).length }
}
/** Return on entry notional, no leverage or compounding. Each leg pays its own notional fee. */
function netReturn(entry: number, exit: number, side: 1 | -1, costs: ValidationCosts, duration: number) {
  const filledEntry = entry * (1 + side * costs.slippage / 100)
  const filledExit = exit * (1 - side * costs.slippage / 100)
  return side * (filledExit / filledEntry - 1) * 100 - costs.fee * (1 + filledExit / filledEntry) - costs.dailyHolding * duration / 86_400_000
}

function segment(candles: readonly Candle[], frames: SignalFrame[], config: ExplorerConfig, costs: ValidationCosts, start: number, end: number, contexts?: ReadonlyMap<number, DerivativeContextPoint>): ValidationSegment {
  const step = timeframes[config.timeframe], side = config.side === 'long' ? 1 : -1
  const trades: ValidationTrade[] = []
  const priceConfig = { ...config, funding: 'any' as const, openInterest: 'any' as const }
  let incomplete = 0, gaps = 0, unknown = 0
  for (let i = start; i < end; i++) {
    if (!matchesFrame(frames, candles, i, config, contexts)) {
      if (hasDerivativeFilters(config) && matchesFrame(frames, candles, i, priceConfig)) {
        // Missing evidence is excluded rather than falling back to a price-only result.
        const at = candles[i].timestamp + step, point = contexts?.get(at)
        if (derivativeUnknown(config, point, at)) unknown++
      }
      continue
    }
    // Reserve the full observation horizon even when a barrier is touched early.
    // Training outcomes cannot use a validation candle, nor validation an unfinished tail.
    if (i + config.horizon >= end) { incomplete++; continue }
    const future = candles.slice(i + 1, i + config.horizon + 1)
    if (future.some((c, j) => c.timestamp - (j ? future[j - 1].timestamp : candles[i].timestamp) !== step)) { gaps++; continue }
    const entry = future[0].open, upper = entry * (1 + config.target / 100), lower = entry * (1 - config.target / 100)
    let outcome: ValidationTrade['outcome'] = 'timeout', low = future.at(-1)!.close, high = low, exitBar = future.at(-1)!
    let exitsAtOpen = false
    for (const c of future) {
      if (c.open >= upper || c.open <= lower) {
        outcome = c.open >= upper ? 'up' : 'down'; low = high = c.open; exitBar = c; exitsAtOpen = true; break
      }
      const up = c.high >= upper, down = c.low <= lower
      if (up || down) {
        outcome = up && down ? 'ambiguous' : up ? 'up' : 'down'
        low = down ? lower : upper; high = up ? upper : lower; exitBar = c; break
      }
    }
    // Intrabar exit times are unknown: charge a full exit candle for the holding-cost assumption.
    const through = exitBar.timestamp + (exitsAtOpen ? 0 : step), duration = through - future[0].timestamp
    const gross = [low, high].map(exit => side * (exit / entry - 1) * 100)
    const net = [low, high].map(exit => netReturn(entry, exit, side, costs, duration))
    trades.push({ signalAt: candles[i].timestamp, enteredAt: future[0].timestamp, exitBarAt: exitBar.timestamp, observedThrough: through,
      entry, exitLow: low, exitHigh: high, outcome, grossLow: Math.min(...gross), grossHigh: Math.max(...gross), netLow: Math.min(...net), netHigh: Math.max(...net) })
    i += config.horizon - 1
  }
  return { from: candles[start].timestamp, to: candles[end - 1].timestamp + step, stats: summarize(trades), trades, incomplete, gaps, unknown }
}
const derivativeUnknown = (config: ExplorerConfig, point: DerivativeContextPoint | undefined, at: number) => derivativeMatch(config, point, at) === 'unknown'

/** Fixed chronological 70/30 comparison. No optimisation, future lookup or claims of untouched holdout. */
export function validateSignalHistory(history: ResearchHistory, config: ExplorerConfig, costs: ValidationCosts, contexts?: ReadonlyMap<number, DerivativeContextPoint>): SignalValidationReport {
  if (!validExplorerConfig(config) || !validValidationCosts(costs)) throw new Error('조건과 비용은 허용 범위의 숫자로 입력해주세요.')
  if (hasDerivativeFilters(config) && !contexts) throw new Error('선택한 과거 파생 자료를 먼저 불러와주세요.')
  const step = timeframes[config.timeframe], candles = history.candles
  if (history.version !== 1 || history.timeframe !== config.timeframe || history.requested !== config.bars || !Number.isFinite(history.asOf) || !Number.isFinite(history.fetchedAt) || !Array.isArray(candles) || candles.length > config.bars || candles.some((c, i) =>
    ![c.timestamp, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) || !Number.isSafeInteger(c.timestamp) || c.timestamp < 0 || c.timestamp % step !== 0 || c.timestamp + step > history.asOf || Math.min(c.open, c.high, c.low, c.close) <= 0 || c.volume < 0 || c.low > Math.min(c.open, c.close) || c.high < Math.max(c.open, c.close) || i > 0 && c.timestamp <= candles[i - 1].timestamp)) throw new Error('완료된 과거 시세의 순서와 값을 확인할 수 없습니다.')
  const split = 60 + Math.floor((candles.length - 60) * .7)
  if (split - 60 <= config.horizon || candles.length - split <= config.horizon) throw new Error('구간을 나누기에는 기록이 짧아요. 조회 범위를 늘리거나 이후 관찰 기간을 줄여주세요.')
  const frames = signalFrames(candles, config.timeframe)
  const training = segment(candles, frames, config, costs, 60, split, contexts)
  const validation = segment(candles, frames, config, costs, split, candles.length, contexts)
  const periods = Array.from({ length: 3 }, (_, i) => {
    const from = candles[split + Math.floor((candles.length - split) * i / 3)].timestamp
    const to = i === 2 ? validation.to : candles[split + Math.floor((candles.length - split) * (i + 1) / 3)].timestamp
    return { from, to, stats: summarize(validation.trades.filter(r => r.signalAt >= from && r.signalAt < to)) }
  })
  // Copy only public evidence and explicit assumptions; never account data or user notes.
  const cleanConfig: ExplorerConfig = { timeframe: config.timeframe, signals: [...config.signals], window: config.window, horizon: config.horizon, target: config.target, cost: config.cost, side: config.side, regime: config.regime, bars: config.bars,
    ...(config.funding ? { funding: config.funding } : {}), ...(config.openInterest ? { openInterest: config.openInterest } : {}) }
  const cleanHistory: ResearchHistory = { version: 1, asset: history.asset, timeframe: history.timeframe, requested: history.requested, fetchedAt: history.fetchedAt, asOf: history.asOf, source: history.source,
    candles: candles.map(c => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })) }
  const points = hasDerivativeFilters(config) ? candles.flatMap(c => {
    const p = contexts?.get(c.timestamp + step)
    if (!p) return []
    return [{ at: p.at,
      funding: p.funding ? { at: p.funding.at, knownAt: p.funding.knownAt, value: p.funding.value } : null,
      openInterest: p.openInterest ? { at: p.openInterest.at, knownAt: p.openInterest.knownAt, value: p.openInterest.value, previousAt: p.openInterest.previousAt, previousKnownAt: p.openInterest.previousKnownAt, previousValue: p.openInterest.previousValue, change24h: p.openInterest.change24h } : null }]
  }) : undefined
  return { version: VALIDATION_VERSION, signalVersion: ENGINE_VERSION, derivativeVersion: hasDerivativeFilters(config) ? DERIVATIVE_FILTER_VERSION : null,
    input: { history: cleanHistory, config: cleanConfig, costs: { fee: costs.fee, slippage: costs.slippage, dailyHolding: costs.dailyHolding }, ...(points ? { contexts: points } : {}) }, splitAt: candles[split].timestamp, splitPercent: 70, training, validation, periods }
}
