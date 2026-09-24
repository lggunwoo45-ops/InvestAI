import { describe, expect, it } from 'vitest'

import type { CandidateSnapshotCurrentState, CandidateSnapshotItem } from '@/types/candidateSnapshot'
import { evaluateCandidateSnapshotFreshness } from './candidateSnapshotFreshness'

const item: CandidateSnapshotItem = { instrumentId: 'btc', symbol: 'BTC/KRW', displayName: 'Bitcoin', assetType: 'crypto', marketId: 'upbit', quoteCurrency: 'KRW', order: 1, basisPrice: 100, basisChange24hPercent: 1, basisVolume24h: 1000, basisMovementBand: 'Limited', interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', reasonText: 'Reason', ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }], dataQuality: 'live', newsState: 'Unavailable', disclosureCount: 0, latestDisclosureAt: null }
const current: CandidateSnapshotCurrentState = { instrumentId: 'btc', currentPrice: 100, interestStage: 'first', actionStatus: 'watchZone', clarity: 'medium', ruleBasis: item.ruleBasis, dataQuality: 'live' }

describe('evaluateCandidateSnapshotFreshness', () => {
  it('returns expired after TTL and unavailable without current data', () => {
    expect(evaluateCandidateSnapshotFreshness(item, current, '2026-09-25T00:00:00Z', '2026-09-26T00:00:00Z').state).toBe('expired')
    expect(evaluateCandidateSnapshotFreshness(item, null, '2026-09-27T00:00:00Z', '2026-09-26T00:00:00Z').state).toBe('unavailable')
  })

  it('holds the basis despite price movement when evidence state is unchanged', () => {
    expect(evaluateCandidateSnapshotFreshness(item, { ...current, currentPrice: 250 }, '2026-09-27T00:00:00Z', '2026-09-26T00:00:00Z')).toEqual({ state: 'basisHeld', changes: [] })
  })

  it('requires a change check when rule basis differs', () => {
    const result = evaluateCandidateSnapshotFreshness(item, { ...current, ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Limited' }] }, '2026-09-27T00:00:00Z', '2026-09-26T00:00:00Z')
    expect(result.state).toBe('changeReview')
    expect(result.changes[0].field).toBe('ruleBasis')
  })
})
