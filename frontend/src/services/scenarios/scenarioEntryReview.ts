import type { FrameRead } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { Scenario } from './scenarioStorage'

export const entryCheckKeys = ['trend', 'rebound', 'volume', 'rewardRisk', 'heat'] as const
export type EntryCheck = typeof entryCheckKeys[number]
export interface ScenarioEntryReview {
  status: 'outside' | 'unavailable' | 'waiting' | 'caution' | 'ready'
  checks: Record<EntryCheck, boolean | null>
  volumeRatio: number | null
  rewardRisk: number | null
  rsi: number | null
  asOf: number | null
}

/** Explicit review rules on one reference timeframe; not a calibrated return probability. */
export function reviewScenarioEntry(s: Scenario, frame: FrameRead, price: number | null): ScenarioEntryReview {
  const result: ScenarioEntryReview = {
    status: 'unavailable', checks: { trend: null, rebound: null, volume: null, rewardRisk: null, heat: null },
    volumeRatio: null, rewardRisk: null, rsi: null, asOf: frame.issue ? null : frame.asOf,
  }
  if (price === null || !Number.isFinite(price) || price <= 0) return result
  const inside = price >= s.entry[0] && price <= s.entry[1]
  if (!inside) return { ...result, status: 'outside' }
  const ratio = (s.target - price) / (price - s.stop)
  result.rewardRisk = Number.isFinite(ratio) && ratio > 0 ? ratio : null
  result.checks.rewardRisk = result.rewardRisk === null ? null : result.rewardRisk >= 1.5
  if (frame.issue || frame.asOf === null || frame.sma20 === null || frame.atr === null || frame.rsi === null) return result
  const last = frame.candles.at(-1), prior = frame.candles.at(-2)
  if (!last || !prior) return result
  result.volumeRatio = frame.volumeRatio
  result.rsi = frame.rsi
  result.checks.trend = frame.direction === 'buy' && price > frame.sma20 + 0.1 * frame.atr
  // A new closed bar must have touched the saved zone and recovered without
  // breaching the stop. The live execution must still hold the prior close.
  result.checks.rebound = frame.asOf > s.updatedAt && last.low <= s.entry[1] && last.high >= s.entry[0]
    && last.low > s.stop && last.close >= s.entry[0] && last.close > last.open && last.close > prior.close && price >= prior.close
  result.checks.volume = frame.volumeRatio === null ? null : frame.volumeRatio >= 1.2
  result.checks.heat = frame.rsi < 70 && price - frame.sma20 <= 2 * frame.atr
  result.status = frame.direction === 'sell' ? 'caution' : entryCheckKeys.every(key => result.checks[key] === true) ? 'ready' : 'waiting'
  return result
}
