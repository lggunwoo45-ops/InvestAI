import { beforeEach, describe, expect, it } from 'vitest'

import type { WatchCandidate } from '@/types/watchCandidate'
import { CANDIDATE_SNAPSHOT_STORAGE_KEY, lifecycleFromSnapshot, loadCandidateSnapshots, saveCandidateSnapshots } from './candidateSnapshotStorage'

const candidate = (score: number, riskScore = 0, scoreLabel: WatchCandidate['scoreLabel'] = 'medium'): WatchCandidate => ({
  id: 'crypto-watch-short-upbit-btc', instrumentId: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin', assetType: 'crypto', horizon: 'short', lifecycleStatus: 'new', reviewCadence: 'Daily', planningZones: { interestArea: '98–100', secondInterestArea: '96–98', targetObservationArea: '102–105', invalidationRiskArea: '95–97', riskRewardNote: 'Reference', confidenceNote: 'Reference' }, rank: 1, watchScore: score, scoreLabel, summary: 'Summary', watchReason: 'Reason', evidence: [{ type: 'risk', label: 'Risk', score: riskScore, maxScore: 0, summary: 'Risk', status: riskScore < 0 ? 'risk' : 'neutral' }], riskSummary: 'Risk', invalidationSummary: 'Invalidation', nextWatchPoints: [], newsEvidence: { source: 'none', scope: 'none', count: 0, headlines: [], generated: false, disclaimer: 'None' }, disclaimer: 'Reference only',
})

describe('candidate snapshot lifecycle', () => {
  beforeEach(() => window.localStorage.clear())
  it('classifies new, maintained, strengthened, weakened, and review-needed candidates', () => {
    expect(lifecycleFromSnapshot(candidate(50), {})).toBe('new')
    saveCandidateSnapshots([candidate(50)])
    const snapshots = loadCandidateSnapshots()
    expect(lifecycleFromSnapshot(candidate(54), snapshots)).toBe('maintained')
    expect(lifecycleFromSnapshot(candidate(56), snapshots)).toBe('strengthened')
    expect(lifecycleFromSnapshot(candidate(44), snapshots)).toBe('weakened')
    expect(lifecycleFromSnapshot(candidate(52, -6), snapshots)).toBe('review-needed')
  })
  it('safely removes invalid snapshots', () => {
    window.localStorage.setItem(CANDIDATE_SNAPSHOT_STORAGE_KEY, '{"schemaVersion":1,"snapshots":[{"bad":true}]}')
    expect(loadCandidateSnapshots()).toEqual({})
    expect(window.localStorage.getItem(CANDIDATE_SNAPSHOT_STORAGE_KEY)).toBeNull()
  })
})
