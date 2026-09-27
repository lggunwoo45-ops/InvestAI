import { describe, expect, it } from 'vitest'

import type { CandidateSnapshotItem } from '@/types/candidateSnapshot'
import type { MarketBucketId } from '@/types/marketBucket'
import type { DailyBucketSnapshot } from './dailyBucketSnapshot'
import { DAILY_BUCKET_SNAPSHOT_STORAGE_KEY, loadDailyBucketSnapshots, saveDailyBucketSnapshot } from './dailyBucketSnapshotStorage'

const item: CandidateSnapshotItem = { instrumentId: 'asset', symbol: 'ASSET', displayName: 'Asset', assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: 1, basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 10, basisMovementBand: 'Normal', interestStage: 'first', actionStatus: 'waiting', clarity: 'low', reasonText: 'Existing evidence.', ruleBasis: [], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null }
const snapshot = (bucketId: MarketBucketId, generatedAt = '2026-09-28T01:00:00.000Z'): DailyBucketSnapshot => ({ schemaVersion: 1, snapshotId: `${bucketId}-${generatedAt}`, tradingDate: '2026-09-28', bucketId, basisTimeLabel: '08:00', generatedAt, basisAt: '2026-09-27T23:00:00.000Z', expiresAt: '2026-09-28T23:00:00.000Z', itemLimit: 5, items: [{ ...item, instrumentId: `${bucketId}-asset` }] })

describe('dailyBucketSnapshotStorage', () => {
  it('keeps separate latest records for Upbit, Binance, KOSPI, and KOSDAQ', () => {
    saveDailyBucketSnapshot(snapshot('upbit'))
    saveDailyBucketSnapshot(snapshot('binance'))
    saveDailyBucketSnapshot(snapshot('kospi'))
    saveDailyBucketSnapshot(snapshot('kosdaq'))
    saveDailyBucketSnapshot(snapshot('upbit', '2026-09-28T02:00:00.000Z'))
    const loaded = loadDailyBucketSnapshots()
    expect(loaded.map((entry) => entry.bucketId)).toEqual(['upbit', 'binance', 'kospi', 'kosdaq'])
    expect(loaded.find((entry) => entry.bucketId === 'upbit')?.generatedAt).toBe('2026-09-28T02:00:00.000Z')
  })

  it('discards corrupted payloads safely', () => {
    localStorage.setItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, snapshots: [{ bucketId: 'upbit' }] }))
    expect(loadDailyBucketSnapshots()).toEqual([])
    expect(localStorage.getItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY)).toBeNull()
  })

  it('stores no personal note, holding, average-price, or order fields', () => {
    saveDailyBucketSnapshot(snapshot('upbit'))
    const raw = localStorage.getItem(DAILY_BUCKET_SNAPSHOT_STORAGE_KEY) ?? ''
    expect(raw).not.toMatch(/userNote|memo|holdingStatus|averagePrice|targetPrice|stopLoss|takeProfit/)
  })

  it('persists an empty reviewed bucket without inventing fallback candidates', () => {
    saveDailyBucketSnapshot({ ...snapshot('kospi'), items: [] })
    expect(loadDailyBucketSnapshots().find((entry) => entry.bucketId === 'kospi')?.items).toEqual([])
  })
})
