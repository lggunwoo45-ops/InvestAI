import { describe, expect, it } from 'vitest'

import type { CandidateReviewScore } from '@/services/candidateScore/candidateReviewScore'
import { applyCandidateQualityGate, evaluateCandidateQualityGate } from './candidateQualityGate'

const score = (value: number | null): CandidateReviewScore => ({ score: value, level: value === null ? 'unavailable' : value >= 75 ? 'strong' : value >= 45 ? 'moderate' : 'low', label: 'Review', summary: 'Evidence review', factors: [], cautions: [] })
const valid = { currentPrice: 100, practicalDecisionState: 'watch' as const, reviewScore: score(60), dataQuality: 'live' as const, freshness: 'basisHeld' as const, missingEvidenceCount: 0, hasCautionState: false }

describe('candidateQualityGate', () => {
  it('excludes invalid price, unavailable decision, unavailable score, low score, unavailable data, and unavailable basis', () => {
    expect(evaluateCandidateQualityGate({ ...valid, currentPrice: Number.NaN }).reason).toBe('invalidPrice')
    expect(evaluateCandidateQualityGate({ ...valid, practicalDecisionState: 'unavailable' }).reason).toBe('insufficientBasis')
    expect(evaluateCandidateQualityGate({ ...valid, reviewScore: score(null) }).reason).toBe('unavailableScore')
    expect(evaluateCandidateQualityGate({ ...valid, reviewScore: score(59) }).reason).toBe('belowThreshold')
    expect(evaluateCandidateQualityGate({ ...valid, dataQuality: 'unavailable' }).reason).toBe('insufficientData')
    expect(evaluateCandidateQualityGate({ ...valid, freshness: 'reviewBasisUnavailable' }).reason).toBe('basisUnavailable')
  })

  it('keeps score 60 or above without treating caution as a new score', () => {
    expect(evaluateCandidateQualityGate(valid)).toEqual({ passes: true, reason: null })
    expect(evaluateCandidateQualityGate({ ...valid, reviewScore: score(82), hasCautionState: true })).toEqual({ passes: true, reason: null })
  })

  it('preserves passing order and returns fewer items rather than filling weak entries', () => {
    const items = [{ id: 'first', value: 72 }, { id: 'low', value: 30 }, { id: 'second', value: 65 }]
    const result = applyCandidateQualityGate(items, (item) => ({ ...valid, reviewScore: score(item.value) }))
    expect(result.passing.map((item) => item.id)).toEqual(['first', 'second'])
    expect(result.excluded).toHaveLength(1)
    expect(result.reasonCounts).toEqual({ belowThreshold: 1 })
  })

  it('has no contract for user average price or memo and uses neutral exclusion reasons', () => {
    expect(Object.keys(valid)).not.toContain('averagePrice')
    expect(Object.keys(valid)).not.toContain('userNote')
    expect(JSON.stringify(applyCandidateQualityGate([{ id: 'low' }], () => ({ ...valid, reviewScore: score(20) })))).not.toMatch(/bad candidate/i)
  })
})
