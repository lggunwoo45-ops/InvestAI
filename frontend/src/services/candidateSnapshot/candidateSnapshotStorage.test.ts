import { describe, expect, it } from 'vitest'

import type { CandidateSnapshot } from '@/types/candidateSnapshot'
import { CANDIDATE_SNAPSHOT_STORAGE_KEY, loadCandidateSnapshotRecords, saveCandidateSnapshotRecord } from './candidateSnapshotStorage'

function snapshot(id: string, generatedAt: string, providerLabel = 'Provider'): CandidateSnapshot { return { schemaVersion: 1, snapshotId: id, generatedAt, expiresAt: '2026-09-30T00:00:00.000Z', engineVersion: 'v1', catalogSource: 'live', providerLabel, items: [{ instrumentId: 'btc', symbol: 'BTC/KRW', displayName: 'Bitcoin', assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: 1, basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 1000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: 'Evidence record', ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null }] } }
function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) }, values } }

describe('candidateSnapshotStorage', () => {
  it('keeps one fixed snapshot for every asset and horizon context', () => {
    const store = storage()
    saveCandidateSnapshotRecord(snapshot('short', '2026-09-25T00:00:00.000Z', 'Upbit KRW · short'), store)
    saveCandidateSnapshotRecord(snapshot('swing', '2026-09-26T00:00:00.000Z', 'Upbit KRW · swing'), store)
    saveCandidateSnapshotRecord(snapshot('long', '2026-09-27T00:00:00.000Z', 'Upbit KRW · long'), store)
    expect(loadCandidateSnapshotRecords(store).map((item) => item.snapshotId)).toEqual(['long', 'swing', 'short'])
  })

  it('replaces only the snapshot for the refreshed context', () => {
    const store = storage()
    saveCandidateSnapshotRecord(snapshot('short-old', '2026-09-25T00:00:00.000Z', 'Upbit KRW · short'), store)
    saveCandidateSnapshotRecord(snapshot('swing', '2026-09-26T00:00:00.000Z', 'Upbit KRW · swing'), store)
    saveCandidateSnapshotRecord(snapshot('short-new', '2026-09-27T00:00:00.000Z', 'Upbit KRW · short'), store)
    expect(loadCandidateSnapshotRecords(store).map((item) => item.snapshotId)).toEqual(['short-new', 'swing'])
  })

  it('rejects corrupted storage and removes it', () => {
    const store = storage()
    store.setItem(CANDIDATE_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, snapshots: [{ corrupted: true }] }))
    expect(loadCandidateSnapshotRecords(store)).toEqual([])
    expect(store.values.has(CANDIDATE_SNAPSHOT_STORAGE_KEY)).toBe(false)
  })
})
