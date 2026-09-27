import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { PracticalDecisionCard } from './PracticalDecisionCard'

describe('PracticalDecisionCard', () => {
  it('renders a clear current read with reason and next check', () => {
    const result = buildPracticalDecision({ language: 'ko', horizon: 'short', dataQuality: 'live', actionStatus: 'conditionalApproach', source: 'analysis' })
    render(<PracticalDecisionCard result={result} language="ko" />)
    const card = screen.getByRole('region', { name: '판단 보조 정보' })
    expect(card.textContent).toContain('지금 판단: 접근 검토 가능')
    expect(card.textContent).toContain('이유')
    expect(card.textContent).toContain('다음 확인')
  })
})
