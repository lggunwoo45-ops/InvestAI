import type { OpportunityPlan } from './opportunityEngine'

export type CandidateAction = 'ready' | 'price' | 'close' | 'volume' | 'recovery' | 'context' | 'excluded'
export type ExclusionReason = 'data' | 'risk' | 'heat' | 'distance' | 'structure' | 'reward' | 'regime'
export interface CandidateVerdict { action: CandidateAction; exclusion: ExclusionReason | null }
type Plan = Pick<OpportunityPlan, 'status' | 'issue' | 'checks'>

/** Readiness is decided by strategy evidence, never by a relative momentum score. */
export function candidateAction(plan: Plan, hasPricePlan: boolean, distant: boolean): CandidateVerdict {
  const fail = (key: string) => plan.checks.some(c => c.key === key && !c.passed)
  const excluded = (exclusion: ExclusionReason): CandidateVerdict => ({ action:'excluded', exclusion })
  if (plan.issue || plan.status === 'unavailable' || !plan.checks.length) return excluded('data')
  if (fail('risk')) return excluded('risk')
  if (fail('heat')) return excluded('heat')
  if (distant) return excluded('distance')
  if (fail('structure')) return excluded('structure')
  if (fail('reward')) return excluded('reward')
  if (fail('regime')) return excluded('regime')
  if (!hasPricePlan || plan.status === 'avoid') return excluded('structure')
  for (const key of ['price', 'close', 'volume', 'recovery', 'context'] as const) {
    if (fail(key)) return { action:key, exclusion:null }
  }
  return plan.status === 'ready' && plan.checks.every(c => c.passed) ? { action:'ready', exclusion:null } : excluded('data')
}

export const actionPriority = (action: CandidateAction) => action === 'ready' ? 0 : action === 'excluded' ? 2 : 1
export const candidatePhase = (verdict: CandidateVerdict) => verdict.action === 'ready' ? 'ready' as const
  : verdict.action === 'excluded' ? 'avoid' as const : verdict.action === 'price' ? 'price-wait' as const : 'confirm-wait' as const

export function actionCounts(rows: readonly { verdict: CandidateVerdict }[]) {
  const ready = rows.filter(r => r.verdict.action === 'ready').length
  const excluded = rows.filter(r => r.verdict.action === 'excluded').length
  return { total:rows.length, ready, waiting:rows.length - ready - excluded, excluded }
}
