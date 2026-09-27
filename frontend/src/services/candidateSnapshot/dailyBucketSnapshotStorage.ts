import type { CandidateSnapshotInterestStage, CandidateSnapshotItem } from '@/types/candidateSnapshot'
import type { ActionReadinessStatus, ActionReadinessStrength, ActionRuleBasisItem, ActionRuleBasisKey, AnalysisDataQuality } from '@/types/myAnalysis'
import { marketBucketIds, type MarketBucketId } from '@/types/marketBucket'
import { DAILY_BUCKET_ITEM_LIMIT, DAILY_BUCKET_SNAPSHOT_SCHEMA_VERSION, type DailyBucketSnapshot } from './dailyBucketSnapshot'

export const DAILY_BUCKET_SNAPSHOT_STORAGE_KEY = 'market-copilot.dailyBucketSnapshots.v1'
const bucketIds = new Set<MarketBucketId>(marketBucketIds)
const stages = new Set<CandidateSnapshotInterestStage>(['waiting', 'first', 'second', 'third', 'chaseCaution', 'reboundCaution'])
const statuses = new Set<ActionReadinessStatus>(['decisionPending', 'waiting', 'watchZone', 'conditionalApproach', 'chaseCaution', 'sharpDropReboundCaution'])
const strengths = new Set<ActionReadinessStrength>(['low', 'medium', 'high'])
const qualities = new Set<AnalysisDataQuality>(['live', 'mock', 'limited', 'unavailable'])
const ruleKeys = new Set<ActionRuleBasisKey>(['dataQuality', 'movementBand', 'candidateState', 'newsState', 'assetKind'])
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const date = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const rule = (value: unknown): value is ActionRuleBasisItem => record(value) && ruleKeys.has(value.key as ActionRuleBasisKey) && typeof value.label === 'string' && typeof value.value === 'string'

function item(value: unknown): value is CandidateSnapshotItem {
  if (!record(value)) return false
  return typeof value.instrumentId === 'string' && typeof value.symbol === 'string' && typeof value.displayName === 'string' && (value.assetType === 'crypto' || value.assetType === 'stock') && typeof value.marketId === 'string' && typeof value.quoteCurrency === 'string' && Number.isInteger(value.order) && Number(value.order) > 0 && finite(value.basisPrice) && Number(value.basisPrice) > 0 && finite(value.basisChange24hPercent) && finite(value.basisVolume24h) && typeof value.basisMovementBand === 'string' && stages.has(value.interestStage as CandidateSnapshotInterestStage) && statuses.has(value.actionStatus as ActionReadinessStatus) && strengths.has(value.clarity as ActionReadinessStrength) && typeof value.reasonText === 'string' && Array.isArray(value.ruleBasis) && value.ruleBasis.every(rule) && qualities.has(value.dataQuality as AnalysisDataQuality) && typeof value.newsState === 'string' && Number.isInteger(value.disclosureCount) && Number(value.disclosureCount) >= 0 && (value.latestDisclosureAt === null || date(value.latestDisclosureAt))
}

export function isDailyBucketSnapshot(value: unknown): value is DailyBucketSnapshot {
  if (!record(value)) return false
  return value.schemaVersion === DAILY_BUCKET_SNAPSHOT_SCHEMA_VERSION && typeof value.snapshotId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(value.tradingDate)) && bucketIds.has(value.bucketId as MarketBucketId) && value.basisTimeLabel === '08:00' && date(value.generatedAt) && date(value.basisAt) && date(value.expiresAt) && value.itemLimit === DAILY_BUCKET_ITEM_LIMIT && Array.isArray(value.items) && value.items.length > 0 && value.items.length <= DAILY_BUCKET_ITEM_LIMIT && value.items.every(item)
}

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>
type WriteStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

export function loadDailyBucketSnapshots(storage: ReadStorage = window.localStorage): readonly DailyBucketSnapshot[] {
  try {
    const raw = storage.getItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.snapshots) || !parsed.snapshots.every(isDailyBucketSnapshot)) throw new Error('invalid daily snapshots')
    const latest = new Map<MarketBucketId, DailyBucketSnapshot>()
    ;[...parsed.snapshots].sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt)).forEach((snapshot) => { if (!latest.has(snapshot.bucketId)) latest.set(snapshot.bucketId, snapshot) })
    return marketBucketIds.flatMap((id) => latest.get(id) ?? [])
  } catch {
    try { storage.removeItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY) } catch { /* Storage recovery must not break rendering. */ }
    return []
  }
}

export function saveDailyBucketSnapshot(snapshot: DailyBucketSnapshot, storage: WriteStorage = window.localStorage): readonly DailyBucketSnapshot[] {
  if (!isDailyBucketSnapshot(snapshot)) return loadDailyBucketSnapshots(storage)
  const snapshots = [snapshot, ...loadDailyBucketSnapshots(storage).filter((item) => item.bucketId !== snapshot.bucketId)]
  try { storage.setItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, snapshots })) } catch { /* Keep the in-memory view usable. */ }
  return snapshots
}

export function findDailyBucketSnapshot(snapshotId: string, bucketId?: MarketBucketId, storage: ReadStorage = window.localStorage) {
  return loadDailyBucketSnapshots(storage).find((snapshot) => snapshot.snapshotId === snapshotId && (!bucketId || snapshot.bucketId === bucketId)) ?? null
}
