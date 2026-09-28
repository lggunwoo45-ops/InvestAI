import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarketBucketSummary } from './MarketBucketSummary'

describe('MarketBucketSummary', () => {
  it('renders English counts and a shortage explanation', () => {
    render(<MarketBucketSummary bucketLabel="Upbit" displayedCount={3} excludedCount={2} reasonCounts={{ belowThreshold: 2 }} language="en" />)
    const summary = screen.getByRole('region', { name: 'Market bucket summary' })
    expect(summary.textContent).toContain('Displayed candidates3')
    expect(summary.textContent).toContain('Excluded candidates2')
    expect(summary.textContent).toContain('Candidate shortage')
    expect(summary.textContent).toContain('Only candidates that pass the current review basis are shown.')
  })

  it('renders Korean labels and a neutral zero-candidate message', () => {
    render(<MarketBucketSummary bucketLabel="코스피" displayedCount={0} excludedCount={5} reasonCounts={{ insufficientBasis: 5 }} language="ko" />)
    const summary = screen.getByRole('region', { name: '시장군 요약' })
    expect(summary.textContent).toContain('표시 후보0')
    expect(summary.textContent).toContain('제외 후보5')
    expect(summary.textContent).toContain('무리해서 후보를 채우지 않습니다')
    expect(summary.textContent).toContain('판단 근거 부족')
    expect(summary.textContent).not.toMatch(/나쁜 후보|bad candidate/i)
  })
})
