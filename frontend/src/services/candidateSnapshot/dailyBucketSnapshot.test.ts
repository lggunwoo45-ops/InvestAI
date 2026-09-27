import { describe, expect, it } from 'vitest'

import type { CandidateSnapshotItem } from '@/types/candidateSnapshot'
import { getDailyBasisTime } from './dailyBasisTime'
import { buildDailyBucketSnapshot } from './dailyBucketSnapshot'

const item = (order: number): CandidateSnapshotItem => ({ instrumentId: `asset-${order}`, symbol: `A${order}`, displayName: `Asset ${order}`, assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order, basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 10, basisMovementBand: 'Normal', interestStage: 'first', actionStatus: 'waiting', clarity: 'low', reasonText: 'Existing candidate order.', ruleBasis: [], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null })

describe('buildDailyBucketSnapshot', () => {
  it('limits items to five and preserves their deterministic order', () => {
    const snapshot = buildDailyBucketSnapshot({ bucketId: 'upbit', snapshotId: 'daily-upbit', generatedAt: '2026-09-28T01:00:00.000Z', basis: getDailyBasisTime(new Date(2026, 8, 28, 10)), items: [4, 2, 6, 1, 5, 3].map(item) })
    expect(snapshot?.itemLimit).toBe(5)
    expect(snapshot?.items.map((entry) => entry.instrumentId)).toEqual(['asset-4', 'asset-2', 'asset-6', 'asset-1', 'asset-5'])
    expect(snapshot?.items.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5])
  })

  it('records an intentionally empty daily result instead of filling weak candidates', () => {
    const snapshot = buildDailyBucketSnapshot({ bucketId: 'kospi', snapshotId: 'daily-kospi', generatedAt: '2026-09-28T01:00:00.000Z', basis: getDailyBasisTime(new Date(2026, 8, 28, 10)), items: [] })
    expect(snapshot?.items).toEqual([])
  })
})
