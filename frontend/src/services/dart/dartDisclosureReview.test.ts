import { describe, expect, it } from 'vitest'

import { dartMockResult } from '@/services/dart/dartFixtures'
import type { DartDisclosureResult } from '@/types/dart'
import { buildDartDisclosureReview } from './dartDisclosureReview'

const state = (status: DartDisclosureResult['status']): DartDisclosureResult => ({ status, sourceMode: 'disabled', message: '', disclosures: [], fetchedAt: null })

describe('buildDartDisclosureReview', () => {
  it.each([
    ['disabled', 'disabled'],
    ['mapping_unavailable', 'mapping_unavailable'],
  ] as const)('returns %s safely', (input, expected) => {
    expect(buildDartDisclosureReview(state(input), 'en').status).toBe(expected)
  })

  it('returns no recent disclosure state for an empty ready result', () => {
    expect(buildDartDisclosureReview({ ...state('ready'), sourceMode: 'live' }, 'en')).toMatchObject({ status: 'no_recent_disclosures', counts: { total: 0 } })
  })

  it('counts periodic, correction, and material disclosures and requests source review', () => {
    const material = { ...dartMockResult.disclosures[0], id: 'material', receiptNo: 'material', disclosureType: 'material' as const, isMaterial: true, isPeriodic: false }
    const review = buildDartDisclosureReview({ ...dartMockResult, disclosures: [...dartMockResult.disclosures, material] }, 'en')
    expect(review.counts).toEqual({ total: 3, periodic: 1, material: 1, correction: 1, other: 0 })
    expect(review.status).toBe('review_needed')
    expect(review.reviewPoints).toEqual(expect.arrayContaining(['Correction disclosures are included.', 'Material disclosures are included.', 'Periodic reports are included.']))
  })

  it('marks periodic-only evidence as available', () => {
    const review = buildDartDisclosureReview({ ...dartMockResult, disclosures: [dartMockResult.disclosures[0]] }, 'en')
    expect(review.status).toBe('review_available')
    expect(review.counts.periodic).toBe(1)
  })

  it('keeps English and Korean review wording free from directional or transaction labels', () => {
    const english = JSON.stringify(buildDartDisclosureReview(dartMockResult, 'en'))
    const korean = JSON.stringify(buildDartDisclosureReview(dartMockResult, 'ko'))
    expect(english).not.toMatch(/positive|negative|buy|sell|price impact/i)
    expect(korean).not.toMatch(/호재|악재|매수|매도|목표가|손절가|익절가/)
  })
})
