import type { Direction } from './cryptoDecisionEngine'
import type { ScanResult } from './liveCandidateScan'
import { baseAsset, relativeToBitcoin } from './opportunityEngine'
import { entryDistance, futuresShortlist, type FuturesPlan, type FuturesSide } from './futuresOpportunities'
import { actionPriority, candidateAction, candidatePhase, type CandidateVerdict } from './candidateAction'

export interface FuturesCandidate {
  result: ScanResult
  plan: FuturesPlan
  phase: 'ready' | 'price-wait' | 'confirm-wait' | 'avoid'
  verdict: CandidateVerdict
  /** Relative review priority, not a probability or an entry permission. */
  score: number
  reason: 'trend' | 'momentum' | 'relative' | 'turnaround'
  higherDirection: Direction
  countertrend: boolean
  change3h: number
  relativeBitcoin: number | null
  volumeRatio: number | null
  hasPricePlan: boolean
  planDistant: boolean
  reassessPrice: number
  reassessConfirmed: boolean
  distancePercent: number | null
}

const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v))
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const directionValue = (direction: Direction) => direction === 'buy' ? 1 : direction === 'sell' ? -1 : 0

/** Discovery is broader than entry eligibility. A weak candidate stays visibly unconfirmed. */
export function rankFuturesCandidates(results: readonly ScanResult[], now: number, side: FuturesSide, costPercent = .2): FuturesCandidate[] {
  const benchmark = results.find(r => r.instrument.marketId === 'binance-futures' && r.instrument.quoteCurrency === 'USDT' && baseAsset(r.instrument.symbol, r.instrument.quoteCurrency) === 'BTC')
  const sign = side === 'long' ? 1 : -1
  return futuresShortlist(results, now, side, costPercent).flatMap(({ result, plan }): FuturesCandidate[] => {
    if (plan.issue || plan.status === 'unavailable') return []
    const { decision } = result
    const hour = decision.frames.find(f => f.frame === '1H' && !f.issue)
    const higher = decision.frames.find(f => f.frame === '4H' && !f.issue) ?? decision.frames.find(f => f.frame === '1D' && !f.issue)
    if (!hour || !higher || hour.candles.length < 50 || !positive(hour.atr) || !positive(hour.sma20) || !positive(decision.price)) return []
    const bars = hour.candles, last = bars.at(-1)!, previous = bars.at(-4)!
    if (!positive(last.close) || !positive(previous.close)) return []
    const change3h = (last.close / previous.close - 1) * 100
    const momentum = sign * (last.close - previous.close) / hour.atr
    const relativeBitcoin = relativeToBitcoin(result, benchmark, now)?.difference ?? null
    const relative = relativeBitcoin === null ? 0 : sign * relativeBitcoin
    const higherAlignment = sign * directionValue(higher.direction)
    const hourAlignment = sign * directionValue(hour.direction)
    const distance = entryDistance(plan, decision.price)
    const distanceAtr = distance * decision.price / 100 / hour.atr
    const planDistant = Number.isFinite(distanceAtr) && distanceAtr > 3
    const hasPricePlan = !planDistant && ['structure', 'reward', 'risk'].every(key => plan.checks.some(c => c.key === key && c.passed))
      && !!plan.entry && positive(plan.stop) && positive(plan.target)
    const verdict = candidateAction(plan, hasPricePlan, planDistant), phase = candidatePhase(verdict)
    // Short-term movement gets more weight than the slower trend. Contrary direction stays explicit.
    const score = hourAlignment * 3 + higherAlignment * 2 + clamp(momentum, 2) * 2 + clamp(relative, 2)
      + (hasPricePlan ? Math.max(0, 2 - distanceAtr) : -1)
      + (hour.volumeRatio !== null && hour.volumeRatio >= 1 && sign * (last.close - last.open) > 0 ? 1 : 0)
      - (plan.checks.some(c => c.key === 'heat' && !c.passed) ? 2 : 0)
    const reason = higherAlignment > 0 && hourAlignment > 0 ? 'trend'
      : momentum > .1 || hourAlignment > 0 ? 'momentum' : relative > 0 ? 'relative' : 'turnaround'
    const prior = bars.slice(-4, -1)
    const reassessPrice = side === 'long' ? Math.max(...prior.map(b => b.high)) : Math.min(...prior.map(b => b.low))
    if (!positive(reassessPrice)) return []
    return [{ result, plan, phase, verdict, score, reason, higherDirection:higher.direction, countertrend:higherAlignment < 0,
      change3h, relativeBitcoin, volumeRatio:hour.volumeRatio, hasPricePlan, planDistant, reassessPrice,
      reassessConfirmed:sign * (last.close - reassessPrice) > 0, distancePercent:Number.isFinite(distance) ? distance : null }]
  }).sort((a, b) => actionPriority(a.verdict.action) - actionPriority(b.verdict.action) || b.score - a.score
    || b.result.instrument.volume24h - a.result.instrument.volume24h || a.result.instrument.id.localeCompare(b.result.instrument.id))
}
