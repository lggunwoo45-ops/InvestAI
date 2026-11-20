import type { CryptoDecision, FrameRead } from './cryptoDecisionEngine'
import type { ScanResult } from './liveCandidateScan'
import { buildOpportunityPlans, freshScanResult, validOpportunityCost, type OpportunityPlan } from './opportunityEngine'

export type FuturesSide = 'long' | 'short'
export type FuturesPlan = Omit<OpportunityPlan, 'kind' | 'netUpsidePercent'> & {
  side: FuturesSide
  kind: OpportunityPlan['kind'] | 'rejection' | 'breakdown'
  potentialReturnPercent: number | null
}
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/** Unleveraged price return. Funding is not included; costs apply to BOTH outcomes. */
export function shortPayoff(entry: number, stop: number, target: number, costPercent: number) {
  if (![entry, stop, target].every(positive) || !(target < entry && entry < stop) || !validOpportunityCost(costPercent)) return null
  const cost = entry * costPercent / 100, reward = entry - target - cost, loss = stop - entry + cost
  return { netRewardRisk: reward / loss, potentialReturnPercent: reward / entry * 100, plannedLossPercent: loss / entry * 100 }
}

/** Only confirmed, already observed pivots; do not project a target to improve reward/risk. */
function pivots(frame: FrameRead, edge: 'high' | 'low') {
  return frame.candles.flatMap((bar, i, bars) => i >= 2 && i < bars.length - 2
    && [bars[i - 2], bars[i - 1], bars[i + 1], bars[i + 2]].every(b => edge === 'high' ? b.high < bar.high : b.low > bar.low) ? [bar[edge]] : [])
}

function shortPlans(decision: CryptoDecision, costPercent: number): FuturesPlan[] {
  const hourly = decision.frames.find(f => f.frame === '1H' && !f.issue)
  const higher = decision.frames.find(f => f.frame === '4H' && !f.issue) ?? decision.frames.find(f => f.frame === '1D' && !f.issue)
  return (['rejection', 'breakdown'] as const).map(kind => {
    const base: FuturesPlan = { side:'short', kind, status:'unavailable', checks:[], entry:null, trigger:null, stop:null, target:null, targetBasis:null, referencePrice:null, priceBasis:'conditional', netRewardRisk:null, potentialReturnPercent:null, plannedLossPercent:null, costPercent, volumeRequired:kind === 'rejection' ? 1 : 1.3, issue:validOpportunityCost(costPercent) ? 'data' : 'cost' }
    if (!validOpportunityCost(costPercent) || decision.direction === 'unavailable' || decision.coverage < 2 || !positive(decision.price)
      || !hourly || !higher || hourly.candles.length < 50 || !positive(hourly.atr) || !positive(hourly.sma20) || hourly.rsi === null || !Number.isFinite(hourly.rsi)) return base
    const h = hourly, bars = h.candles, last = bars.at(-1)!, previous = bars.at(-2)!, atr = h.atr!, price = decision.price
    const supports = pivots(h, 'low').sort((a, b) => b - a)
    const resistances = [...pivots(h, 'high'), h.sma20!].filter(n => n + atr * .25 >= price && n - price <= atr * 3).sort((a, b) => a - b)
    // Try the nearest feasible observed resistance, not just a nearby average with no room to profit.
    // The target remains the nearest intervening support; never skip it for a better-looking ratio.
    const resistance = resistances.find(n => {
      const low = n - atr * .25, target = supports.find(s => s < low)
      const basis = price >= low && price <= n + atr * .25 ? price : low
      return target !== undefined && (shortPayoff(basis, n + atr, target, costPercent)?.netRewardRisk ?? 0) >= 1.5
    }) ?? resistances[0]
    const trigger = kind === 'breakdown' ? Math.min(...bars.slice(-21, -1).map(b => b.low)) - atr * .1 : resistance ?? null
    const entry: readonly [number, number] | null = positive(trigger) ? kind === 'breakdown' ? [trigger - atr * .5, trigger] : [trigger - atr * .25, trigger + atr * .25] : null
    const stop = positive(trigger) ? trigger + atr * (kind === 'breakdown' ? 1.2 : 1) : null
    const target = entry ? supports.find(n => n < entry[0]) ?? null : null
    const inZone = !!entry && price >= entry[0] && price <= entry[1]
    // A lower short entry earns less and risks more. Use it for conditional plans.
    const referencePrice = inZone ? price : entry?.[0] ?? null
    const structure = !!entry && [...entry, stop, target].every(positive) && target! < entry[0] && entry[0] <= entry[1] && entry[1] < stop!
    const payoff = structure ? shortPayoff(referencePrice!, stop!, target!, costPercent) : null
    const checks: FuturesPlan['checks'] = [
      { key:'regime', passed:higher.direction === 'sell' },
      { key:'close', passed:!!entry && last.close < last.open && last.close < previous.close && (kind === 'breakdown' ? last.close < trigger! : last.close >= entry[0] && last.close <= entry[1]) },
      { key:'volume', passed:h.volumeRatio !== null && h.volumeRatio >= base.volumeRequired },
      { key:'price', passed:inZone }, { key:'structure', passed:structure },
      { key:'reward', passed:!!payoff && payoff.netRewardRisk >= 1.5 },
      { key:'heat', passed:h.rsi! > 30 && price >= h.sma20! - atr * 2 && Math.abs(price - last.close) <= atr * 1.5 },
      { key:'risk', passed:positive(stop) && price < stop },
      // Selling flow / alt weakness are long headwinds, not reasons to block a short.
      { key:'context', passed:decision.context?.flow !== 'buy' },
    ]
    const invalid = checks.some(c => ['regime', 'structure', 'reward', 'heat', 'risk'].includes(c.key) && !c.passed)
    return { ...base, issue:null, checks, status:checks.every(c => c.passed) ? 'ready' : invalid ? 'avoid' : 'watch', entry, trigger, stop, target, targetBasis:target ? 'swing' : null, referencePrice, priceBasis:inZone ? 'current' : 'conditional', ...payoff }
  })
}

/** Price/venue identities and expiry are checked before either direction is evaluated. */
export function futuresPlans(result: ScanResult, now: number, costPercent = .2): FuturesPlan[] {
  if (result.instrument.marketId !== 'binance-futures' || result.instrument.quoteCurrency !== 'USDT' || !freshScanResult(result, now)) return []
  const longs: FuturesPlan[] = buildOpportunityPlans(result.decision, costPercent).map(plan => ({ ...plan, side:'long', potentialReturnPercent:plan.netUpsidePercent }))
  return [...longs, ...shortPlans(result.decision, costPercent)]
}

export function entryDistance(plan: FuturesPlan, price: number | null) {
  if (!plan.entry || !positive(price)) return Infinity
  return Math.max(plan.entry[0] - price, price - plan.entry[1], 0) / price * 100
}
export function futuresShortlist(results: readonly ScanResult[], now: number, side: FuturesSide, costPercent = .2) {
  const priority = { ready:0, watch:1, avoid:2, unavailable:3 }
  return results.flatMap(result => {
    const plans = futuresPlans(result, now, costPercent).filter(p => p.side === side).sort((a, b) => priority[a.status] - priority[b.status]
      || a.checks.filter(c => !c.passed).length - b.checks.filter(c => !c.passed).length
      || entryDistance(a, result.decision.price) - entryDistance(b, result.decision.price))
    return plans[0] ? [{ result, plan:plans[0] }] : []
  }).sort((a, b) => priority[a.plan.status] - priority[b.plan.status]
    || a.plan.checks.filter(c => !c.passed).length - b.plan.checks.filter(c => !c.passed).length
    || entryDistance(a.plan, a.result.decision.price) - entryDistance(b.plan, b.result.decision.price)
    || b.result.instrument.volume24h - a.result.instrument.volume24h)
}
