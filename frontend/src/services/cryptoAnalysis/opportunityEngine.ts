import { wilderRsi, type CryptoDecision, type FrameRead } from './cryptoDecisionEngine'
import type { ScanResult } from './liveCandidateScan'

export type OpportunityKind = 'pullback' | 'breakout' | 'rebound'
export type OpportunityStatus = 'ready' | 'watch' | 'avoid' | 'unavailable'
export type CheckKey = 'regime' | 'close' | 'volume' | 'recovery' | 'price' | 'structure' | 'reward' | 'heat' | 'risk' | 'context'
export interface OpportunityPlan {
  kind: OpportunityKind
  status: OpportunityStatus
  checks: { key: CheckKey; passed: boolean }[]
  entry: readonly [number, number] | null
  trigger: number | null
  stop: number | null
  target: number | null
  targetBasis: 'swing' | 'average' | null
  referencePrice: number | null
  priceBasis: 'current' | 'conditional'
  netRewardRisk: number | null
  netUpsidePercent: number | null
  plannedLossPercent: number | null
  costPercent: number
  volumeRequired: number
  issue: 'data' | 'cost' | null
}
const kinds: OpportunityKind[] = ['pullback', 'breakout', 'rebound']
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
export const validOpportunityCost = (n: number) => Number.isFinite(n) && n >= 0 && n <= 3

/** Fixed round-trip cost assumption per outcome, including the losing outcome. */
export function opportunityPayoff(entry: number, stop: number, target: number, costPercent: number) {
  if (![entry, stop, target].every(positive) || !(stop < entry && entry < target) || !validOpportunityCost(costPercent)) return null
  const cost = entry * costPercent / 100
  const reward = target - entry - cost, loss = entry - stop + cost
  return { netRewardRisk: reward / loss, netUpsidePercent: reward / entry * 100, plannedLossPercent: loss / entry * 100 }
}

/** Nearest overhead swing high; no ATR projection is invented to pass the R/R gate. */
function overhead(frame: FrameRead, above: number, average?: number | null) {
  const candidates: { price: number; basis: 'swing' | 'average' }[] = []
  const bars = frame.candles
  // The last two bars cannot confirm a pivot; no future bars are used.
  for (let i = 2; i < bars.length - 2; i++) {
    const high = bars[i].high
    if (high > above && [bars[i - 2], bars[i - 1], bars[i + 1], bars[i + 2]].every(b => b.high < high)) candidates.push({ price: high, basis: 'swing' })
  }
  if (positive(average) && average > above) candidates.push({ price: average, basis: 'average' })
  return candidates.sort((a, b) => a.price - b.price)[0] ?? null
}

/** Strategy hypotheses, not calibrated predictions. All signals use verified CLOSED bars. */
export function buildOpportunityPlans(decision: CryptoDecision, costPercent = .2): OpportunityPlan[] {
  const hourly = decision.frames.find(f => f.frame === '1H' && !f.issue)
  const higher = decision.frames.find(f => f.frame === '4H' && !f.issue) ?? decision.frames.find(f => f.frame === '1D' && !f.issue)
  const dataReady = decision.direction !== 'unavailable' && decision.coverage >= 2 && positive(decision.price)
    && hourly && higher && hourly.candles.length >= 50 && positive(hourly.atr) && positive(hourly.sma20) && hourly.rsi !== null && Number.isFinite(hourly.rsi)
  const empty = (kind: OpportunityKind): OpportunityPlan => ({ kind, status:'unavailable', checks:[], entry:null, trigger:null, stop:null, target:null, targetBasis:null, referencePrice:null, priceBasis:'conditional', netRewardRisk:null, netUpsidePercent:null, plannedLossPercent:null, costPercent, volumeRequired:kind === 'pullback' ? 1 : 1.3, issue:validOpportunityCost(costPercent) ? 'data' : 'cost' })
  if (!dataReady || !validOpportunityCost(costPercent)) return kinds.map(empty)
  const h = hourly!, bars = h.candles, last = bars.at(-1)!, previous = bars.at(-2)!, atr = h.atr!, price = decision.price!
  const previousRsi = wilderRsi(bars.slice(0, -1).map(b => b.close))
  return kinds.map(kind => {
    const base = empty(kind), original = decision.plan
    let entry: readonly [number, number] | null = null, stop: number | null = null, target: number | null = null, targetBasis: OpportunityPlan['targetBasis'] = null
    let trigger: number | null = null, regime = false, closed = false, recovery = true
    if (kind === 'pullback') {
      regime = decision.direction === 'buy'
      if (original) {
        entry = original.entry; stop = original.stop; trigger = entry[0]
        if (original.targetBasis === 'observed') { target = original.target; targetBasis = 'swing' }
        closed = last.close >= entry[0] && last.close <= entry[1] && last.close > previous.close && last.close > last.open
      }
    } else {
      const lookback = kind === 'breakout' ? 20 : 3
      trigger = Math.max(...bars.slice(-lookback - 1, -1).map(b => b.high)) + (kind === 'breakout' ? atr * .1 : 0)
      entry = [trigger, trigger + atr * .5]
      stop = kind === 'breakout' ? trigger - atr * 1.2 : Math.min(...bars.slice(-6, -1).map(b => b.low)) - atr * .25
      const resistance = overhead(h, entry[0], kind === 'rebound' ? higher!.sma20 : undefined)
      target = resistance?.price ?? null; targetBasis = resistance?.basis ?? null
      closed = last.close > trigger && last.close > last.open
      regime = kind === 'rebound' ? higher!.direction === 'sell' : higher!.direction !== 'sell'
      recovery = kind !== 'rebound' || (previousRsi !== null && previousRsi <= 45 && h.rsi! >= 35 && h.rsi! <= 65 && h.rsi! - previousRsi >= 2 && last.close > previous.close)
    }
    const inZone = !!entry && price >= entry[0] && price <= entry[1]
    // Waiting plans use the upper edge, never a more flattering hypothetical midpoint.
    const referencePrice = inZone ? price : entry?.[1] ?? null
    const structure = !!entry && [...entry, stop, target].every(positive) && stop! < entry[0] && entry[0] <= entry[1] && entry[1] < target!
    const payoff = structure ? opportunityPayoff(referencePrice!, stop!, target!, costPercent) : null
    const checks: OpportunityPlan['checks'] = [
      { key:'regime', passed:regime }, { key:'close', passed:closed },
      { key:'volume', passed:h.volumeRatio !== null && h.volumeRatio >= base.volumeRequired },
      ...(kind === 'rebound' ? [{key:'recovery' as const,passed:recovery}] : []),
      { key:'price', passed:inZone }, { key:'structure', passed:structure },
      { key:'reward', passed:!!payoff && payoff.netRewardRisk >= 1.5 },
      { key:'heat', passed:h.rsi! < 70 && price <= h.sma20! + atr * 2 && Math.abs(price - last.close) <= atr * 1.5 },
      { key:'risk', passed:positive(stop) && price > stop },
      { key:'context', passed:!decision.context?.cautions.length },
    ]
    const invalid = !regime || !structure || !payoff || payoff.netRewardRisk < 1.5 || (positive(stop) && price <= stop) || !checks.find(c => c.key === 'heat')!.passed
    const status: OpportunityStatus = checks.every(c => c.passed) ? 'ready' : invalid ? 'avoid' : 'watch'
    return { ...base, issue:null, status, checks, entry, trigger, stop, target, targetBasis, referencePrice, priceBasis:inZone ? 'current' : 'conditional', ...payoff }
  })
}

const statusPriority: Record<OpportunityStatus, number> = { ready:0, watch:1, avoid:2, unavailable:3 }
export function bestOpportunity(plans: readonly OpportunityPlan[]) {
  return [...plans].sort((a, b) => statusPriority[a.status] - statusPriority[b.status]
    || b.checks.filter(c => c.passed).length / Math.max(1, b.checks.length) - a.checks.filter(c => c.passed).length / Math.max(1, a.checks.length)
    || kinds.indexOf(a.kind) - kinds.indexOf(b.kind))[0]
}
export const freshScanResult = (row: ScanResult, now: number) => Number.isFinite(row.analyzedAt) && Number.isFinite(row.expiresAt) && now >= row.analyzedAt && now <= row.expiresAt
export const baseAsset = (symbol: string, quote: string) => { const name = symbol.toUpperCase().replace('/', ''); return name.endsWith(quote.toUpperCase()) ? name.slice(0, -quote.length) : name }

/** Same venue, quote and seven exact hourly closes; a positive spread can still mean both fell. */
export function relativeToBitcoin(result: ScanResult, benchmark: ScanResult | undefined, now: number) {
  if (!benchmark || benchmark.instrument.id === result.instrument.id || !freshScanResult(result, now) || !freshScanResult(benchmark, now)
    || result.instrument.marketId !== benchmark.instrument.marketId || result.instrument.quoteCurrency !== benchmark.instrument.quoteCurrency
    || baseAsset(benchmark.instrument.symbol, benchmark.instrument.quoteCurrency) !== 'BTC') return null
  const a = result.decision.frames.find(f => f.frame === '1H' && !f.issue), b = benchmark.decision.frames.find(f => f.frame === '1H' && !f.issue)
  if (!a || !b) return null
  const end = Math.min(a.candles.at(-1)?.timestamp ?? 0, b.candles.at(-1)?.timestamp ?? 0)
  if (!end || a.candles.at(-1)?.timestamp !== end || b.candles.at(-1)?.timestamp !== end) return null
  const times = Array.from({length:7}, (_, i) => end - (6 - i) * 3_600_000)
  const prices = (f: FrameRead) => times.map(t => f.candles.find(c => c.timestamp === t)?.close)
  const aa = prices(a), bb = prices(b)
  if (!aa.every(positive) || !bb.every(positive)) return null
  const assetReturn = (aa[6]! / aa[0]! - 1) * 100, bitcoinReturn = (bb[6]! / bb[0]! - 1) * 100
  return { assetReturn, bitcoinReturn, difference:assetReturn - bitcoinReturn }
}

export function opportunityShortlist(results: readonly ScanResult[], now: number, costPercent = .2) {
  const fresh = results.filter(r => freshScanResult(r, now))
  const btc = fresh.find(r => baseAsset(r.instrument.symbol, r.instrument.quoteCurrency) === 'BTC')
  return fresh.map(result => {
    const plans = buildOpportunityPlans(result.decision, costPercent)
    return { result, plans, best:bestOpportunity(plans), relative:relativeToBitcoin(result, btc, now) }
  }).sort((a, b) => statusPriority[a.best.status] - statusPriority[b.best.status]
    || (b.relative?.difference ?? -Infinity) - (a.relative?.difference ?? -Infinity)
    || b.result.instrument.volume24h - a.result.instrument.volume24h || a.result.instrument.id.localeCompare(b.result.instrument.id))
}

/** Planned loss budget is not an execution guarantee; gaps can exceed it. No leverage. */
export function opportunityPositionSize(plan: OpportunityPlan, lossBudget: number, capitalLimit: number) {
  if (!['ready','watch'].includes(plan.status) || !positive(plan.referencePrice) || !positive(plan.plannedLossPercent) || !positive(lossBudget) || !positive(capitalLimit)) return null
  const perUnitLoss = plan.referencePrice * plan.plannedLossPercent / 100
  const quantity = Math.min(lossBudget / perUnitLoss, capitalLimit / plan.referencePrice)
  return Number.isFinite(quantity) ? { quantity, notional:quantity * plan.referencePrice, plannedLoss:quantity * perUnitLoss } : null
}
