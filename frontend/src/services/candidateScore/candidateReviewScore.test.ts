import { describe, expect, it } from 'vitest'

import { buildCandidateReviewScore, clampCandidateReviewScore } from './candidateReviewScore'

const base = {
  language: 'en' as const,
  dataQuality: 'live' as const,
  practicalDecisionState: 'approachReview' as const,
  clarity: 'high' as const,
  hasReviewRanges: true,
  freshness: 'basisHeld' as const,
  evidenceCount: 5,
  missingEvidenceCount: 0,
  hasNewsEvidence: true,
  hasDisclosureEvidence: true,
}

describe('candidateReviewScore', () => {
  it('clamps scores to integer values from 0 to 100', () => {
    expect(clampCandidateReviewScore(-4.8)).toBe(0)
    expect(clampCandidateReviewScore(61.6)).toBe(62)
    expect(clampCandidateReviewScore(140)).toBe(100)
  })

  it('builds a strong review score when multiple live factors are aligned', () => {
    const result = buildCandidateReviewScore(base)
    expect(result.score).toBe(100)
    expect(result.level).toBe('strong')
    expect(result.factors).toContain('News evidence is available.')
  })

  it('caps mock, expired, missing-basis, and movement-caution states', () => {
    expect(buildCandidateReviewScore({ ...base, dataQuality: 'mock' }).score).toBeLessThanOrEqual(40)
    expect(buildCandidateReviewScore({ ...base, freshness: 'expired' }).score).toBeLessThanOrEqual(60)
    expect(buildCandidateReviewScore({ ...base, freshness: 'reviewBasisUnavailable' }).score).toBeLessThanOrEqual(50)
    expect(buildCandidateReviewScore({ ...base, practicalDecisionState: 'extendedCaution' }).score).toBeLessThanOrEqual(70)
    expect(buildCandidateReviewScore({ ...base, practicalDecisionState: 'postDropReview' }).score).toBeLessThanOrEqual(70)
  })

  it('returns unavailable when the review basis is insufficient', () => {
    expect(buildCandidateReviewScore({ ...base, dataQuality: 'unavailable' })).toMatchObject({ score: null, level: 'unavailable' })
    expect(buildCandidateReviewScore({ ...base, evidenceCount: 0 })).toMatchObject({ score: null, level: 'unavailable' })
    expect(buildCandidateReviewScore({ ...base, freshness: 'priceUnavailable' })).toMatchObject({ score: null, level: 'unavailable' })
  })

  it('does not accept personal price, note, return, or performance inputs', () => {
    const keys = Object.keys(base)
    expect(keys).not.toContain('averagePrice')
    expect(keys).not.toContain('userNote')
    expect(keys).not.toContain('expectedReturn')
    expect(keys).not.toContain('performance')
  })
})
