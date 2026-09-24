import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildDartDisclosureReview } from '@/services/dart/dartDisclosureReview'
import { dartMockResult } from '@/services/dart/dartFixtures'
import { DartDisclosureReviewCard } from './DartDisclosureReviewCard'

describe('DartDisclosureReviewCard', () => {
  it('renders counts and review points', () => {
    render(<DartDisclosureReviewCard language="en" review={buildDartDisclosureReview(dartMockResult, 'en')} disclosurePanelId="dart-disclosures" />)
    const card = screen.getByRole('region', { name: 'Disclosure review' })
    expect(card.textContent).toContain('Periodic report1')
    expect(card.textContent).toContain('Correction disclosure1')
    expect(card.textContent).toContain('Correction disclosures are included.')
    expect(screen.getByRole('link', { name: /Check original disclosure/ }).getAttribute('href')).toBe('#dart-disclosures')
  })

  it('renders Korean labels without unsafe interpretation', () => {
    render(<DartDisclosureReviewCard language="ko" review={buildDartDisclosureReview(dartMockResult, 'ko')} />)
    const card = screen.getByRole('region', { name: '공시 점검' })
    expect(card.textContent).toContain('공시 확인 필요')
    expect(card.textContent).toContain('확인 포인트')
    expect(card.textContent).not.toMatch(/호재|악재|매수|매도|목표가|손절가|익절가/)
  })
})
