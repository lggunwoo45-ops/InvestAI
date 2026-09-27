import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import { ReviewRangePanel } from './ReviewRangePanel'

describe('ReviewRangePanel', () => {
  it('renders approximate ranges and a safe boundary', () => {
    render(<ReviewRangePanel ranges={buildReviewRanges({ anchorPrice: 100, dataQuality: 'live', horizon: 'short', language: 'en', source: 'current' })} language="en" quoteCurrency="USD" />)
    const panel = screen.getByRole('region', { name: 'Review ranges' })
    expect(panel.textContent).toContain('Approach review range')
    expect(panel.textContent).toContain('98.8 ~ 100.6 USD')
    expect(panel.textContent).toContain('not an order price')
    expect(panel.textContent).not.toMatch(/stop loss|take profit|target price/i)
  })

  it('renders an unavailable explanation without numeric ranges', () => {
    render(<ReviewRangePanel ranges={[]} language="ko" quoteCurrency="KRW" />)
    expect(screen.getByRole('status').textContent).toContain('검토 범위 생성 불가')
  })
})
