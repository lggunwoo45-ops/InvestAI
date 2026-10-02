import { describe, expect, it } from 'vitest'

import type { CandidateSnapshotCurrentState, CandidateSnapshotItem } from '@/types/candidateSnapshot'
import { buildCandidateTerminalItems } from './candidateTerminalModel'

function item(order: number): CandidateSnapshotItem {
  return {
    instrumentId: `asset-${order}`,
    symbol: `A${order}/KRW`,
    displayName: `Asset ${order}`,
    assetType: 'crypto',
    marketId: 'upbit',
    quoteCurrency: 'KRW',
    order,
    basisPrice: 100,
    basisChange24hPercent: 1,
    basisVolume24h: 1_000,
    basisMovementBand: 'Limited',
    interestStage: 'first',
    actionStatus: 'watchZone',
    clarity: 'medium',
    reasonText: 'Saved evidence.',
    ruleBasis: [{ key: 'dataQuality', label: 'Data quality', value: 'Live' }],
    dataQuality: 'live',
    newsState: 'Unavailable',
    disclosureCount: 0,
    latestDisclosureAt: null,
  }
}

function currentState(candidate: CandidateSnapshotItem, currentPrice: number): CandidateSnapshotCurrentState {
  return {
    instrumentId: candidate.instrumentId,
    currentPrice,
    interestStage: candidate.interestStage,
    actionStatus: candidate.actionStatus,
    clarity: candidate.clarity,
    ruleBasis: candidate.ruleBasis,
    dataQuality: candidate.dataQuality,
  }
}

describe('buildCandidateTerminalItems', () => {
  it('keeps snapshot order, limits output to five, and does not mutate the input', () => {
    const candidates = [4, 2, 6, 1, 5, 3].map(item)
    const originalOrder = candidates.map((candidate) => candidate.order)
    const result = buildCandidateTerminalItems({
      items: candidates,
      expiresAt: '2026-09-29T01:00:00.000Z',
      currentStates: new Map(candidates.map((candidate) => [candidate.instrumentId, currentState(candidate, 100 + candidate.order)])),
      currentPrices: new Map(),
      horizon: 'swing',
      language: 'en',
      now: '2026-09-28T01:00:00.000Z',
    })

    expect(result.map((candidate) => candidate.item.order)).toEqual([1, 2, 3, 4, 5])
    expect(result).toHaveLength(5)
    expect(candidates.map((candidate) => candidate.order)).toEqual(originalOrder)
  })

  it('prefers a valid current state price, safely falls back to catalog price, and supports an empty list', () => {
    const first = item(1)
    const second = item(2)
    const result = buildCandidateTerminalItems({
      items: [first, second],
      expiresAt: '2026-09-29T01:00:00.000Z',
      currentStates: new Map([
        [first.instrumentId, currentState(first, 112)],
        [second.instrumentId, currentState(second, 0)],
      ]),
      currentPrices: new Map([[second.instrumentId, 107]]),
      horizon: 'swing',
      language: 'en',
      now: '2026-09-28T01:00:00.000Z',
    })

    expect(result.map(({ currentPrice, changeSinceBasis }) => ({ currentPrice, changeSinceBasis }))).toEqual([
      { currentPrice: 112, changeSinceBasis: 12 },
      { currentPrice: 107, changeSinceBasis: 7 },
    ])
    expect(buildCandidateTerminalItems({
      items: [],
      expiresAt: '2026-09-29T01:00:00.000Z',
      currentStates: new Map(),
      currentPrices: new Map(),
      horizon: 'swing',
      language: 'en',
      now: '2026-09-28T01:00:00.000Z',
    })).toEqual([])
  })

  it('keeps snapshot order when current prices and evidence states change', () => {
    const candidates = [item(3), item(1), item(2)]
    const build = (prices: readonly number[], changed = false) => buildCandidateTerminalItems({
      items: candidates,
      expiresAt: new Date(2026, 8, 29, 12).toISOString(),
      currentStates: new Map(candidates.map((candidate, index) => [candidate.instrumentId, {
        ...currentState(candidate, prices[index]),
        actionStatus: changed && index === 1 ? 'conditionalApproach' as const : candidate.actionStatus,
        clarity: changed && index === 1 ? 'high' as const : candidate.clarity,
      }])),
      currentPrices: new Map(),
      horizon: 'swing',
      language: 'en',
      now: new Date(2026, 8, 28, 12).toISOString(),
    })

    const initial = build([105, 101, 103])
    const changed = build([50, 500, 1], true)
    expect(initial.map((candidate) => candidate.item.instrumentId)).toEqual(['asset-1', 'asset-2', 'asset-3'])
    expect(changed.map((candidate) => candidate.item.instrumentId)).toEqual(['asset-1', 'asset-2', 'asset-3'])
    expect(changed.map((candidate) => candidate.currentPrice)).not.toEqual(initial.map((candidate) => candidate.currentPrice))
  })
})
