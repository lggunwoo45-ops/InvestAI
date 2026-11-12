import type { CryptoDecision, FrameRead, AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { seriesMarketTime } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'

export type ScenarioSide = 'upside' | 'downside'
export type ScenarioBasis = 'pivot' | 'observed' | 'atr'
export interface ScenarioZone { low: number; high: number; basis: ScenarioBasis }
export interface PriceScenario { first: ScenarioZone | null; next: ScenarioZone | null; reassess: number | null }
export interface PriceScenarios {
  status: 'ready' | 'unavailable'
  issue: 'data' | 'history' | 'range'
  instrumentId: string
  venue: string
  symbol: string
  currency: string
  price: number | null
  frame: '1H' | '4H' | '1D'
  asOf: number | null
  bias: CryptoDecision['direction'] | 'unassessed'
  atr: number | null
  count: number
  upside: PriceScenario
  downside: PriceScenario
}
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const emptySide = (): PriceScenario => ({ first: null, next: null, reassess: null })
function empty(instrument: MarketInstrument, issue: PriceScenarios['issue'] = 'data'): PriceScenarios {
  return { status: 'unavailable', issue, instrumentId: instrument.id, venue: instrument.marketId, symbol: instrument.displaySymbol ?? instrument.symbol, currency: instrument.quoteCurrency, price: null, frame: '1D', asOf: null, bias: 'unavailable', atr: null, count: 0, upside: emptySide(), downside: emptySide() }
}
function zone(low: number, high: number, basis: ScenarioBasis): ScenarioZone | null {
  return positive(low) && positive(high) && low <= high ? { low, high, basis } : null
}
function observed(read: FrameRead, side: ScenarioSide, boundary: number): number | null {
  const candidates = read.candles.slice(-60).map(c => side === 'upside' ? c.high : c.low)
    .filter(p => positive(p) && (side === 'upside' ? p > boundary : p < boundary))
    .sort((a, b) => side === 'upside' ? a - b : b - a)
  return candidates[0] ?? null
}
function fromCenter(center: number, atr: number, basis: ScenarioBasis) { return zone(center - atr * .25, center + atr * .25, basis) }
function further(read: FrameRead, side: ScenarioSide, first: ScenarioZone | null): ScenarioZone | null {
  if (!first || !positive(read.atr)) return null
  const atr = read.atr, sign = side === 'upside' ? 1 : -1, edge = side === 'upside' ? first.high : first.low
  const candidate = observed(read, side, edge + sign * atr * .25)
  // The extension is a volatility reference, never an observed support/resistance.
  return fromCenter(candidate ?? edge + sign * atr * 2, atr, candidate === null ? 'atr' : 'observed')
}

/** Uses the existing plan unchanged for the first zones and reassessment levels. */
export function buildCryptoPriceScenarios(instrument: MarketInstrument, decision: CryptoDecision): PriceScenarios {
  if (decision.direction === 'unavailable' || !positive(decision.price)) return empty(instrument)
  const read = decision.frames.find(r => !r.issue && r.frame === decision.plan?.frame)
    ?? decision.frames.find(r => !r.issue && r.frame === '4H')
    ?? decision.frames.find(r => !r.issue && r.frame === '1D')
    ?? decision.frames.find(r => !r.issue)
  if (!read || !positive(read.atr)) return empty(instrument, 'range')
  const price = decision.price, atr = read.atr, plan = decision.plan
  const upObserved = observed(read, 'upside', price + atr * .25)
  const downObserved = observed(read, 'downside', price - atr * .25)
  const up = plan ? zone(plan.resistance[0], plan.resistance[1], plan.targetBasis === 'atr' ? 'atr' : 'observed')
    : fromCenter(upObserved ?? price + atr * 2, atr, upObserved === null ? 'atr' : 'observed')
  const down = plan ? zone(plan.entry[0], plan.entry[1], plan.supportBasis === 'pivot' ? 'pivot' : 'observed')
    : fromCenter(downObserved ?? price - atr * 2, atr, downObserved === null ? 'atr' : 'observed')
  const upReassess = plan?.stop ?? (down ? down.low - atr * .75 : null)
  const downReassess = plan?.sellInvalidation ?? (up ? up.high + atr * .25 : null)
  return { ...empty(instrument), status: 'ready', price, frame: read.frame, asOf: read.asOf, bias: decision.direction, atr, count: read.count,
    upside: { first: up, next: further(read, 'upside', up), reassess: positive(upReassess) ? upReassess : null },
    downside: { first: down, next: further(read, 'downside', down), reassess: positive(downReassess) ? downReassess : null } }
}

/** Stock sessions have weekends/holidays: do not apply crypto's continuous-bar gap rule. */
export function buildStockPriceScenarios(instrument: MarketInstrument, series: AnalysisSeries, now: number): PriceScenarios {
  if (series.dataQuality !== 'live' || series.connectionStatus !== 'live' || !positive(series.currentPrice)
    || !positive(series.updatedAt) || now - series.updatedAt > 90_000 || series.updatedAt > now + 60_000) return empty(instrument)
  const marketNow = seriesMarketTime(series, now)
  // A conservative daily cut excludes today's still-forming bar without assuming exchange hours.
  const candles = series.candles.filter(c => c.timestamp + 86_400_000 <= marketNow)
  if (!candles.length || marketNow - Math.max(...candles.map(c => c.timestamp)) > 7 * 86_400_000) return empty(instrument, 'history')
  const levels = buildTechnicalLevelAnalysis({ instrument: { ...instrument, lastPrice: series.currentPrice }, candles, dataQuality: 'live' }).levelSet
  if (levels.status !== 'ready') return empty(instrument, levels.unavailableReason === 'insufficientCandles' ? 'history' : 'range')
  if (!positive(levels.asOfTimestamp) || marketNow - levels.asOfTimestamp > 7 * 86_400_000) return empty(instrument, 'history')
  const point = (p: number | null | undefined) => positive(p) ? zone(p, p, 'observed') : null
  return { ...empty(instrument), status: 'ready', price: series.currentPrice, frame: '1D', asOf: levels.asOfTimestamp, bias: 'unassessed', count: levels.candleCount,
    upside: { first: point(levels.firstResistance?.price), next: point(levels.secondResistance?.price), reassess: levels.firstSupport?.price ?? null },
    downside: { first: point(levels.firstSupport?.price), next: point(levels.secondSupport?.price), reassess: levels.firstResistance?.price ?? null } }
}
