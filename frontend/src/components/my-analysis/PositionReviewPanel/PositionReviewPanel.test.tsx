import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PositionReviewPanel } from './PositionReviewPanel'
import { derivePositionReview } from './positionReviewModel'

describe('PositionReviewPanel', () => {
  it('shows a compact helper without a basis price', () => {
    render(<PositionReviewPanel basisPrice={null} currentPrice={100} dataQuality="live" language="en" nextCheck="Review evidence." quoteCurrency="USD" />)
    expect(screen.getByRole('region', { name: 'Position review' }).textContent).toContain('Enter your basis price')
  })

  it('shows basis, current value, and qualitative review state', () => {
    expect(derivePositionReview(110, 100, 'live').state).toBe('profitProtection')
    expect(derivePositionReview(90, 100, 'live').state).toBe('invalidationReview')
    render(<PositionReviewPanel basisPrice={100} currentPrice={110} dataQuality="live" language="en" nextCheck="Review evidence." quoteCurrency="USD" />)
    const panel = screen.getByRole('region', { name: 'Position review' })
    expect(panel.textContent).toContain('100 USD')
    expect(panel.textContent).toContain('110 USD')
    expect(panel.textContent).toContain('+10% · +10 USD')
    expect(panel.textContent).toContain('Profit protection review')
    expect(panel.textContent).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit/i)
  })

  it('renders Korean invalidation review wording', () => {
    render(<PositionReviewPanel basisPrice={100} currentPrice={90} dataQuality="live" language="ko" nextCheck="근거를 확인하세요." quoteCurrency="KRW" />)
    expect(screen.getByRole('region', { name: '보유 종목 점검' }).textContent).toContain('무효화 기준 점검')
  })
})
