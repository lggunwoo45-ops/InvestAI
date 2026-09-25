import type { CandidateSnapshot, CandidateSnapshotInterestStage } from '@/types/candidateSnapshot'
import type { ActionReadinessStatus, ActionReadinessStrength, ActionRuleBasisItem, ActionRuleBasisKey, AnalysisDataQuality } from '@/types/myAnalysis'

export const CANDIDATE_SNAPSHOT_STORAGE_KEY = 'market-copilot.candidateSnapshots.v1'
const MAX_SNAPSHOTS = 2
const stages = new Set<CandidateSnapshotInterestStage>(['waiting', 'first', 'second', 'third', 'chaseCaution', 'reboundCaution'])
const statuses = new Set<ActionReadinessStatus>(['decisionPending', 'waiting', 'watchZone', 'conditionalApproach', 'chaseCaution', 'sharpDropReboundCaution'])
const strengths = new Set<ActionReadinessStrength>(['low', 'medium', 'high'])
const qualities = new Set<AnalysisDataQuality>(['live', 'mock', 'limited', 'unavailable'])
const ruleKeys = new Set<ActionRuleBasisKey>(['dataQuality', 'movementBand', 'candidateState', 'newsState', 'assetKind'])
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const date = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))

function validRule(value: unknown): value is ActionRuleBasisItem { return isRecord(value) && ruleKeys.has(value.key as ActionRuleBasisKey) && typeof value.label === 'string' && typeof value.value === 'string' }
function validItem(value: unknown) {
  if (!isRecord(value)) return false
  return typeof value.instrumentId === 'string' && typeof value.symbol === 'string' && typeof value.displayName === 'string' && (value.assetType === 'crypto' || value.assetType === 'stock') && typeof value.marketId === 'string' && typeof value.quoteCurrency === 'string' && Number.isInteger(value.order) && Number(value.order) > 0 && finite(value.basisPrice) && Number(value.basisPrice) > 0 && finite(value.basisChange24hPercent) && finite(value.basisVolume24h) && typeof value.basisMovementBand === 'string' && stages.has(value.interestStage as CandidateSnapshotInterestStage) && statuses.has(value.actionStatus as ActionReadinessStatus) && strengths.has(value.clarity as ActionReadinessStrength) && typeof value.reasonText === 'string' && Array.isArray(value.ruleBasis) && value.ruleBasis.every(validRule) && qualities.has(value.dataQuality as AnalysisDataQuality) && typeof value.newsState === 'string' && Number.isInteger(value.disclosureCount) && Number(value.disclosureCount) >= 0 && (value.latestDisclosureAt === null || date(value.latestDisclosureAt))
}
function validSnapshot(value: unknown): value is CandidateSnapshot {
  return isRecord(value) && value.schemaVersion === 1 && typeof value.snapshotId === 'string' && date(value.generatedAt) && date(value.expiresAt) && typeof value.engineVersion === 'string' && typeof value.catalogSource === 'string' && typeof value.providerLabel === 'string' && Array.isArray(value.items) && value.items.length > 0 && value.items.every(validItem)
}

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>
type WriteStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

export function loadCandidateSnapshotRecords(storage: ReadStorage = window.localStorage): readonly CandidateSnapshot[] {
  try {
    const raw = storage.getItem(CANDIDATE_SNAPSHOT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.snapshots) || !parsed.snapshots.every(validSnapshot)) throw new Error('invalid snapshots')
    return [...parsed.snapshots].sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt)).slice(0, MAX_SNAPSHOTS)
  } catch {
    try { storage.removeItem(CANDIDATE_SNAPSHOT_STORAGE_KEY) } catch { /* Keep the application usable. */ }
    return []
  }
}

export function saveCandidateSnapshotRecord(snapshot: CandidateSnapshot, storage: WriteStorage = window.localStorage): readonly CandidateSnapshot[] {
  if (!validSnapshot(snapshot)) return loadCandidateSnapshotRecords(storage)
  const retained = [snapshot, ...loadCandidateSnapshotRecords(storage).filter((item) => item.snapshotId !== snapshot.snapshotId)]
    .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt)).slice(0, MAX_SNAPSHOTS)
  try { storage.setItem(CANDIDATE_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, snapshots: retained })) } catch { /* Keep the current UI usable. */ }
  return retained
}

export function findCandidateSnapshot(snapshotId: string, storage: ReadStorage = window.localStorage) {
  return loadCandidateSnapshotRecords(storage).find((snapshot) => snapshot.snapshotId === snapshotId) ?? null
}
