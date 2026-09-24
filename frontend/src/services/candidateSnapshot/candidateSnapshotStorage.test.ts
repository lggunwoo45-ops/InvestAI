import { describe, expect, it } from 'vitest'

import type { CandidateSnapshot } from '@/types/candidateSnapshot'
import { CANDIDATE_SNAPSHOT_STORAGE_KEY, loadCandidateSnapshotRecords, saveCandidateSnapshotRecord } from './candidateSnapshotStorage'

function snapshot(id: string, generatedAt: string): CandidateSnapshot { return { schemaVersion: 1, snapshotId: id, generatedAt, expiresAt: '2026-09-30T00:00:00.000Z', engineVersion: 'v1', catalogSource: 'live', providerLabel: 'Provider', items: [{ instrumentId: 'btc', symbol: 'BTC/KRW', displayName: 'Bitcoin', assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: 1, basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 1000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: 'Evidence record', ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null }] } }
function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) }, values } }

describe('candidateSnapshotStorage', () => {
  it('saves and loads valid snapshots while keeping only two', () => {
    const store = storage()
    saveCandidateSnapshotRecord(snapshot('one', '2026-09-25T00:00:00.000Z'), store)
    saveCandidateSnapshotRecord(snapshot('two', '2026-09-26T00:00:00.000Z'), store)
    saveCandidateSnapshotRecord(snapshot('three', '2026-09-27T00:00:00.000Z'), store)
    expect(loadCandidateSnapshotRecords(store).map((item) => item.snapshotId)).toEqual(['three', 'two'])
  })

  it('rejects corrupted storage and removes it', () => {
    const store = storage()
    store.setItem(CANDIDATE_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, snapshots: [{ corrupted: true }] }))
    expect(loadCandidateSnapshotRecords(store)).toEqual([])
    expect(store.values.has(CANDIDATE_SNAPSHOT_STORAGE_KEY)).toBe(false)
  })
})
