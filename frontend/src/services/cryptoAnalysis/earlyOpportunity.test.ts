import { expect, it } from 'vitest'
import { opportunityDecision } from '@/test/opportunityFixtures'
import { bestOpportunity, buildOpportunityPlans } from './opportunityEngine'
import { earlyOpportunity } from './earlyOpportunity'

export function pendingRebound() {
  const decision = opportunityDecision()
  decision.frames.find(frame => frame.frame === '1H')!.volumeRatio = 1
  return decision
}
it('surfaces an unconfirmed rebound without changing its eligibility or loss criteria', () => {
  const decision = pendingRebound(), plan = bestOpportunity(buildOpportunityPlans(decision))
  expect(plan.status).toBe('watch')
  expect(earlyOpportunity(plan, decision)).toEqual({ distancePercent: 0, distanceAtr: 0, remaining: 1 })
  expect(plan.status).toBe('watch')
  expect(plan.netRewardRisk).toBeGreaterThanOrEqual(1.5)
})
it('never promotes ready, unfavorable, invalid-cost, distant, overheated or missing-data plans', () => {
  const decision = pendingRebound(), plan = bestOpportunity(buildOpportunityPlans(decision))
  const hour = decision.frames.find(frame => frame.frame === '1H')!
  expect(earlyOpportunity(plan, { ...decision, price: plan.entry![1] + hour.atr! * 1.01 })).toBeNull()
  expect(earlyOpportunity(plan, { ...decision, direction: 'unavailable' })).toBeNull()
  expect(earlyOpportunity(plan, { ...decision, frames: [] })).toBeNull()
  for (const status of ['ready', 'avoid', 'unavailable'] as const) expect(earlyOpportunity({ ...plan, status }, decision)).toBeNull()
  for (const key of ['regime', 'structure', 'reward', 'heat', 'risk', 'context']) {
    expect(earlyOpportunity({ ...plan, checks: plan.checks.map(check => check.key === key ? { ...check, passed: false } : check) }, decision)).toBeNull()
  }
  expect(earlyOpportunity(bestOpportunity(buildOpportunityPlans(decision, NaN)), decision)).toBeNull()
})
