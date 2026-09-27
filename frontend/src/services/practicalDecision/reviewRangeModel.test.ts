import { describe, expect, it } from 'vitest'

import { buildReviewRanges } from './reviewRangeModel'

describe('buildReviewRanges', () => {
  it('creates up to three approximate live ranges without exposing assumptions', () => {
    const ranges = buildReviewRanges({ anchorPrice: 100, dataQuality: 'live', horizon: 'short', language: 'en', source: 'current' })
    expect(ranges).toHaveLength(3)
    expect(ranges[0]).toMatchObject({ kind: 'approachReviewRange', label: 'Approach review range', isRangeApproximation: true })
    expect(ranges[0].lowPrice).not.toBe(ranges[0].highPrice)
    expect(JSON.stringify(ranges)).not.toMatch(/1\.2%|percentage|target price|stop loss|take profit/i)
  })

  it('does not create ranges without a valid live price', () => {
    expect(buildReviewRanges({ anchorPrice: Number.NaN, dataQuality: 'live', horizon: 'short', language: 'en', source: 'current' })).toEqual([])
    expect(buildReviewRanges({ anchorPrice: 100, dataQuality: 'mock', horizon: 'short', language: 'en', source: 'current' })).toEqual([])
    expect(buildReviewRanges({ anchorPrice: 100, dataQuality: 'unavailable', horizon: 'short', language: 'en', source: 'current' })).toEqual([])
  })

  it('marks expired snapshot ranges as historical', () => {
    const ranges = buildReviewRanges({ anchorPrice: 100, dataQuality: 'live', horizon: 'swing', language: 'ko', source: 'snapshot', expired: true })
    expect(ranges[0].source).toBe('historical-snapshot')
    expect(ranges[0].description).toContain('과거 스냅샷')
  })
})
