import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CandidateReviewScoreBadge } from './CandidateReviewScoreBadge'

describe('CandidateReviewScoreBadge', () => {
  it('renders a Korean evidence-based score', () => {
    render(<CandidateReviewScoreBadge language="ko" result={{ score: 82, level: 'strong', label: '높음', summary: 'summary', factors: [], cautions: [] }} />)
    expect(screen.getByText('검토 점수 82/100')).toBeTruthy()
    expect(screen.getByText('현재 근거 기준 점수입니다.')).toBeTruthy()
  })

  it('renders an unavailable state without inventing a number', () => {
    render(<CandidateReviewScoreBadge language="en" result={{ score: null, level: 'unavailable', label: 'Unavailable', summary: 'summary', factors: [], cautions: [] }} />)
    expect(screen.getByText('Score unavailable')).toBeTruthy()
    expect(document.body.textContent).not.toContain('/100')
  })
})
