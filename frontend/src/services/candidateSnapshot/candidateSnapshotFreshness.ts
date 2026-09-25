import type { CandidateSnapshotCurrentState, CandidateSnapshotFreshnessResult, CandidateSnapshotItem } from '@/types/candidateSnapshot'

function ruleValue(items: CandidateSnapshotItem['ruleBasis'] | CandidateSnapshotCurrentState['ruleBasis']) {
  return [...items].sort((left, right) => left.key.localeCompare(right.key)).map((item) => `${item.key}:${item.value}`).join('|')
}

/** Compares evidence state only. Price direction and return thresholds are intentionally ignored. */
export function evaluateCandidateSnapshotFreshness(item: CandidateSnapshotItem, current: CandidateSnapshotCurrentState | null, expiresAt: string, now: string): CandidateSnapshotFreshnessResult {
  if (Date.parse(now) > Date.parse(expiresAt)) return { state: 'expired', changes: [] }
  if (!current || !Number.isFinite(current.currentPrice) || current.currentPrice <= 0 || current.ruleBasis.length === 0) return { state: 'unavailable', changes: [] }
  const changes: CandidateSnapshotFreshnessResult['changes'][number][] = []
  const previousRules = ruleValue(item.ruleBasis)
  const currentRules = ruleValue(current.ruleBasis)
  if (previousRules !== currentRules) changes.push({ field: 'ruleBasis', previousValue: previousRules, currentValue: currentRules })
  if (item.interestStage !== current.interestStage) changes.push({ field: 'interestStage', previousValue: item.interestStage, currentValue: current.interestStage })
  if (item.actionStatus !== current.actionStatus) changes.push({ field: 'actionStatus', previousValue: item.actionStatus, currentValue: current.actionStatus })
  if (item.dataQuality !== current.dataQuality) changes.push({ field: 'dataQuality', previousValue: item.dataQuality, currentValue: current.dataQuality })
  return { state: changes.length ? 'changeReview' : 'basisHeld', changes }
}
