import type { ScanResult } from './liveCandidateScan'
import { baseAsset, bestOpportunity, buildOpportunityPlans, freshScanResult, relativeToBitcoin, type OpportunityPlan } from './opportunityEngine'
import { actionPriority, candidateAction, candidatePhase, type CandidateVerdict } from './candidateAction'

export interface SpotCandidate {
  result: ScanResult
  plan: OpportunityPlan
  phase: 'ready' | 'price-wait' | 'confirm-wait' | 'avoid'
  verdict: CandidateVerdict
  reason: 'strength' | 'rebound' | 'momentum' | 'pullback' | 'relative' | 'turnaround'
  countertrend: boolean
  score: number
  change3h: number
  relativeBitcoin: number | null
  volumeRatio: number | null
  hasPricePlan: boolean
  planDistant: boolean
  distancePercent: number | null
  reassessPrice: number
  reassessConfirmed: boolean
}

const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const clamp = (n: number) => Math.max(-2, Math.min(2, n))

/** Broader spot discovery never changes strict entry eligibility or the validation ledger. */
export function rankSpotCandidates(results: readonly ScanResult[], now: number, costPercent = .2): SpotCandidate[] {
  return results.flatMap((result): SpotCandidate[] => {
    const { instrument, decision } = result
    if (!freshScanResult(result, now) || !['upbit', 'binance-spot'].includes(instrument.marketId)
      || !(instrument.marketId === 'upbit' ? ['KRW', 'BTC', 'USDT'] : ['USDT']).includes(instrument.quoteCurrency)) return []
    const plan = bestOpportunity(buildOpportunityPlans(decision, costPercent))
    if (!plan || plan.issue || plan.status === 'unavailable') return []
    const hour = decision.frames.find(f => f.frame === '1H' && !f.issue)
    const higher = decision.frames.find(f => f.frame === '4H' && !f.issue) ?? decision.frames.find(f => f.frame === '1D' && !f.issue)
    if (!hour || !higher || hour.candles.length < 50 || !positive(hour.atr) || !positive(decision.price)) return []
    const bars = hour.candles, last = bars.at(-1)!, previous = bars.at(-2)!, start = bars.at(-4)!
    if (![last.close, previous.close, start.close].every(positive)) return []
    const benchmark = results.find(r => r.instrument.marketId === instrument.marketId && r.instrument.quoteCurrency === instrument.quoteCurrency
      && baseAsset(r.instrument.symbol, r.instrument.quoteCurrency) === 'BTC')
    const relativeBitcoin = relativeToBitcoin(result, benchmark, now)?.difference ?? null
    const momentum = (last.close - start.close) / hour.atr
    const change3h = (last.close / start.close - 1) * 100
    const recovering = momentum > .1 && last.close > previous.close
    const distance = plan.entry ? Math.max(plan.entry[0] - decision.price, decision.price - plan.entry[1], 0) : Infinity
    const distanceAtr = distance / hour.atr, planDistant = Number.isFinite(distanceAtr) && distanceAtr > 3
    const hasPricePlan = !planDistant && ['structure', 'reward', 'risk'].every(key => plan.checks.some(c => c.key === key && c.passed))
      && !!plan.entry && positive(plan.stop) && positive(plan.target)
    const verdict = candidateAction(plan, hasPricePlan, planDistant), phase = candidatePhase(verdict)
    const countertrend = higher.direction === 'sell'
    const reason: SpotCandidate['reason'] = higher.direction === 'buy' && hour.direction === 'buy' ? 'strength'
      : recovering ? countertrend ? 'rebound' : 'momentum' : momentum > .1 ? 'pullback'
        : (relativeBitcoin ?? 0) > 0 ? 'relative' : 'turnaround'
    const score = clamp(momentum) * 4 + clamp(relativeBitcoin ?? 0)
      + (hour.direction === 'buy' ? 2 : hour.direction === 'sell' ? -2 : 0)
      + (higher.direction === 'buy' ? 1 : countertrend ? -1 : 0)
      + (recovering ? 2 : 0) + (hour.volumeRatio !== null && hour.volumeRatio >= 1 && last.close > last.open ? 1 : 0)
      + (hasPricePlan ? Math.max(0, 2 - distanceAtr) : -1)
      - (plan.checks.some(c => c.key === 'heat' && !c.passed) ? 2 : 0)
    const reassessPrice = Math.max(...bars.slice(-4, -1).map(b => b.high))
    if (!positive(reassessPrice)) return []
    return [{ result, plan, phase, verdict, reason, countertrend, score, change3h, relativeBitcoin, volumeRatio: hour.volumeRatio,
      hasPricePlan, planDistant, distancePercent: Number.isFinite(distance) ? distance / decision.price * 100 : null,
      reassessPrice, reassessConfirmed: last.close > reassessPrice }]
  }).sort((a, b) => actionPriority(a.verdict.action) - actionPriority(b.verdict.action) || b.score - a.score
    || b.result.instrument.volume24h - a.result.instrument.volume24h || a.result.instrument.id.localeCompare(b.result.instrument.id))
}
