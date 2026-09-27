import type { CandidateSnapshotItem } from '@/types/candidateSnapshot'
import type { MarketBucketId } from '@/types/marketBucket'
import type { DailyBasisTime } from './dailyBasisTime'

export const DAILY_BUCKET_SNAPSHOT_SCHEMA_VERSION = 1 as const
export const DAILY_BUCKET_ITEM_LIMIT = 5 as const

export interface DailyBucketSnapshot {
  schemaVersion: typeof DAILY_BUCKET_SNAPSHOT_SCHEMA_VERSION
  snapshotId: string
  tradingDate: string
  bucketId: MarketBucketId
  basisTimeLabel: '08:00'
  generatedAt: string
  basisAt: string
  expiresAt: string
  itemLimit: typeof DAILY_BUCKET_ITEM_LIMIT
  items: readonly CandidateSnapshotItem[]
}

interface BuildDailyBucketSnapshotInput {
  bucketId: MarketBucketId
  snapshotId: string
  generatedAt: string
  basis: DailyBasisTime
  items: readonly CandidateSnapshotItem[]
}

export function buildDailyBucketSnapshot(input: BuildDailyBucketSnapshotInput): DailyBucketSnapshot | null {
  const items = input.items.slice(0, DAILY_BUCKET_ITEM_LIMIT).map((item, index) => ({ ...item, order: index + 1 }))
  if (!items.length) return null
  return {
    schemaVersion: DAILY_BUCKET_SNAPSHOT_SCHEMA_VERSION,
    snapshotId: input.snapshotId,
    tradingDate: input.basis.tradingDateLabel,
    bucketId: input.bucketId,
    basisTimeLabel: '08:00',
    generatedAt: input.generatedAt,
    basisAt: input.basis.currentDailyBasisAt,
    expiresAt: input.basis.nextDailyBasisAt,
    itemLimit: DAILY_BUCKET_ITEM_LIMIT,
    items,
  }
}
