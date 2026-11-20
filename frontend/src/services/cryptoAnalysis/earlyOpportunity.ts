import type { CryptoDecision } from './cryptoDecisionEngine'
import type { OpportunityPlan } from './opportunityEngine'

/** An early watch is still pending, never eligible for a confirmed-entry record. */
export function earlyOpportunity(plan: OpportunityPlan, decision: CryptoDecision) {
  if (plan.status !== 'watch' || plan.issue || !plan.entry || decision.direction === 'unavailable') return null
  const hour = decision.frames.find(frame => frame.frame === '1H' && !frame.issue)
  const price = decision.price, atr = hour?.atr
  if (!price || !Number.isFinite(price) || !atr || !Number.isFinite(atr) || atr <= 0) return null
  const required = ['regime', 'structure', 'reward', 'heat', 'risk', 'context']
  if (!required.every(key => plan.checks.some(check => check.key === key && check.passed))) return null
  const remaining = plan.checks.filter(check => !check.passed)
  if (!remaining.length || remaining.length > 3) return null
  const distance = Math.max(plan.entry[0] - price, price - plan.entry[1], 0)
  if (distance > atr) return null
  return { distancePercent: distance / price * 100, distanceAtr: distance / atr, remaining: remaining.length }
}
