import { describe, expect, it, vi } from 'vitest'

import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import type { CandidateQualityGateInput } from './candidateQualityGate'
import {
  CANDIDATE_DISPLAY_FILTER_STORAGE_KEY,
  classifyCandidateQualityStatus,
  filterDisplayedCandidates,
  loadCandidateDisplayFilter,
  saveCandidateDisplayFilter,
} from './candidateDisplayClassification'

const score = (value: number | null): CandidateReviewScore => ({ score: value, level: value === null ? 'unavailable' : value >= 75 ? 'strong' : value >= 45 ? 'moderate' : 'low', label: 'Review', summary: 'Evidence review', factors: [], cautions: [] })
const input = (value: number | null): CandidateQualityGateInput => ({ currentPrice: 100, practicalDecisionState: 'watch', reviewScore: score(value), dataQuality: 'live', freshness: 'basisHeld', missingEvidenceCount: 0, hasCautionState: false })

describe('candidate display classification', () => {
  it('uses the Standard 60 boundary without changing source order', () => {
    const items = [{ id: 'a', score: 72 }, { id: 'b', score: 59 }, { id: 'c', score: 60 }, { id: 'd', score: 49 }]
    const result = classifyCandidateQualityStatus(items, (item) => input(item.score))

    expect(result.displayed.map((item) => item.id)).toEqual(['a', 'c'])
    expect(result.heldForReview.map(({ item }) => item.id)).toEqual(['b'])
    expect(result.excluded.map(({ item }) => item.id)).toEqual(['d'])
    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps quality status independent from the Strict view boundary', () => {
    const items = [{ id: 'a', score: 70 }, { id: 'b', score: 69 }, { id: 'c', score: 50 }]
    const result = classifyCandidateQualityStatus(items, (item) => input(item.score))

    expect(result.displayed.map((item) => item.id)).toEqual(['a', 'b'])
    expect(result.heldForReview.map(({ item }) => item.id)).toEqual(['c'])
    expect(result.excluded).toHaveLength(0)
    expect(filterDisplayedCandidates(result.displayed, (item) => input(item.score), 'strict').map((item) => item.id)).toEqual(['a'])
    expect(filterDisplayedCandidates(result.displayed, (item) => input(item.score), 'standard').map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('projects a filter without changing the saved candidate record or its order', () => {
    const snapshot = {
      snapshotId: 'daily-upbit-2026-10-03',
      items: [{ id: 'first', score: 65, order: 1 }, { id: 'second', score: 75, order: 2 }],
    }
    const before = JSON.stringify(snapshot)

    const strict = filterDisplayedCandidates(snapshot.items, (item) => input(item.score), 'strict')
    const standard = filterDisplayedCandidates(snapshot.items, (item) => input(item.score), 'standard')

    expect(strict.map((item) => item.id)).toEqual(['second'])
    expect(standard.map((item) => item.id)).toEqual(['first', 'second'])
    expect(JSON.stringify(snapshot)).toBe(before)
    expect(snapshot.snapshotId).toBe('daily-upbit-2026-10-03')
    expect(snapshot.items.map((item) => item.order)).toEqual([1, 2])
  })

  it('keeps Wider view main candidates identical to Standard while held remains separate', () => {
    const items = [{ id: 'displayed', score: 60 }, { id: 'held', score: 50 }, { id: 'excluded', score: 49 }]
    const result = classifyCandidateQualityStatus(items, (item) => input(item.score))

    expect(result.displayed.map((item) => item.id)).toEqual(['displayed'])
    expect(result.heldForReview.map(({ item, reason }) => [item.id, reason])).toEqual([['held', 'reviewScoreTooLow']])
    expect(result.excluded.map(({ item, reason }) => [item.id, reason])).toEqual([['excluded', 'reviewScoreTooLow']])
    expect(filterDisplayedCandidates(result.displayed, (item) => input(item.score), 'wider')).toEqual(result.displayed)
  })

  it('separates unavailable evidence states from held candidates', () => {
    const items = ['price', 'basis', 'data', 'decision', 'score'] as const
    const result = classifyCandidateQualityStatus(items, (item) => ({
      ...input(65),
      ...(item === 'price' ? { currentPrice: Number.NaN } : {}),
      ...(item === 'basis' ? { freshness: 'reviewBasisUnavailable' as const } : {}),
      ...(item === 'data' ? { dataQuality: 'unavailable' as const } : {}),
      ...(item === 'decision' ? { practicalDecisionState: 'unavailable' as const } : {}),
      ...(item === 'score' ? { reviewScore: score(null) } : {}),
    }))

    expect(result.heldForReview).toHaveLength(0)
    expect(result.excluded.map(({ reason }) => reason)).toEqual(['currentPriceUnavailable', 'currentBasisUnavailable', 'dataQualityInsufficient', 'reviewBasisInsufficient', 'reviewBasisInsufficient'])
  })

  it('explains one displayed and four excluded candidates with exact reason counts', () => {
    const items = ['ready', 'low', 'price', 'data', 'basis'] as const
    const result = classifyCandidateQualityStatus(items, (item) => ({
      ...input(item === 'low' ? 49 : 72),
      ...(item === 'price' ? { currentPrice: 0 } : {}),
      ...(item === 'data' ? { dataQuality: 'unavailable' as const } : {}),
      ...(item === 'basis' ? { freshness: 'reviewBasisUnavailable' as const } : {}),
    }))

    expect(result.displayed).toEqual(['ready'])
    expect(result.heldForReview).toHaveLength(0)
    expect(result.excluded.map(({ item }) => item)).toEqual(['low', 'price', 'data', 'basis'])
    expect(result.excludedReasonCounts).toEqual({
      reviewScoreTooLow: 1,
      currentPriceUnavailable: 1,
      dataQualityInsufficient: 1,
      currentBasisUnavailable: 1,
    })
  })

  it('holds incomplete or stale review basis after hard exclusions and preserves order', () => {
    const items = ['missing', 'changed', 'expired', 'ready'] as const
    const result = classifyCandidateQualityStatus(items, (item) => ({
      ...input(72),
      ...(item === 'missing' ? { missingEvidenceCount: 1 } : {}),
      ...(item === 'changed' ? { freshness: 'changeReview' as const } : {}),
      ...(item === 'expired' ? { freshness: 'expired' as const } : {}),
    }))

    expect(result.displayed).toEqual(['ready'])
    expect(result.heldForReview.map(({ item, reason }) => [item, reason])).toEqual([
      ['missing', 'reviewBasisInsufficient'],
      ['changed', 'reviewBasisInsufficient'],
      ['expired', 'reviewBasisInsufficient'],
    ])
    expect(result.excluded).toHaveLength(0)
  })
})

describe('candidate display filter persistence', () => {
  it('defaults to Standard and removes corrupt or unsupported payloads', () => {
    for (const raw of ['"strict"', '42', '{"schemaVersion":1,"filter":"unknown"}', '{"corrupted":true}']) {
      const storage = { getItem: vi.fn(() => raw), removeItem: vi.fn() }
      expect(loadCandidateDisplayFilter(storage)).toBe('standard')
      expect(storage.removeItem).toHaveBeenCalledWith(CANDIDATE_DISPLAY_FILTER_STORAGE_KEY)
    }
  })

  it('round-trips a runtime-valid selection', () => {
    let raw: string | null = null
    const storage = { getItem: vi.fn(() => raw), removeItem: vi.fn(), setItem: vi.fn((key: string, value: string) => { if (key === CANDIDATE_DISPLAY_FILTER_STORAGE_KEY) raw = value }) }
    saveCandidateDisplayFilter('wider', storage)
    expect(loadCandidateDisplayFilter(storage)).toBe('wider')
    expect(JSON.parse(raw ?? '')).toEqual({ schemaVersion: 1, filter: 'wider' })
  })
})
