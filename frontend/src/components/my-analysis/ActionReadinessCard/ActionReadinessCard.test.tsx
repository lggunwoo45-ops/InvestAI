import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ActionReadinessPlan } from '@/types/myAnalysis'
import { ActionReadinessCard } from './ActionReadinessCard'

const mockPlan: ActionReadinessPlan = {
  status: 'decisionPending',
  strength: 'low',
  dataQuality: 'mock',
  dataQualityLabel: 'Workflow preview',
  title: 'Decision pending',
  summary: 'There is not enough reliable data to form a useful action state.',
  whyThisStatus: 'This is a workflow preview using mock/demo data. Use it to understand the analysis structure, not to act on market conditions.',
  approachConditions: ['Connect live data before using action readiness.', 'Review whether price, movement, and volume are available.', 'Confirm whether related news is source-linked.'],
  avoidConditions: ['Do not treat demo data as live market context.', 'Do not use mock stock movement as evidence.'],
  nextChecks: ['Recheck data quality, movement, activity, and news context together.', 'Wait for new evidence or a meaningful change in conditions before reviewing the status.'],
  ruleBasis: [
    { key: 'dataQuality', label: 'Data quality', value: 'Workflow preview' },
    { key: 'movementBand', label: 'Movement state', value: 'Moderate upward movement' },
    { key: 'candidateState', label: 'Candidate evidence', value: 'Available' },
    { key: 'newsState', label: 'News state', value: 'Market-level only' },
    { key: 'assetKind', label: 'Asset type', value: 'Crypto' },
  ],
  disclaimer: 'Action status is generated from rule-based evidence conditions. This is not a trade instruction.',
}

describe('ActionReadinessCard', () => {
  it('renders one status label, separate clarity, and a useful mock workflow preview', () => {
    render(<ActionReadinessCard plan={mockPlan} language="en" mode="simple" />)
    const card = screen.getByRole('region', { name: 'Current action status' })
    expect(within(card).getAllByText('Decision pending')).toHaveLength(1)
    expect(within(card).getByText('Signal clarity: Low clarity')).toBeTruthy()
    expect(card.textContent).toContain('This describes how clearly the rule-based status is classified, not expected return.')
    expect(card.textContent).toContain('There is not enough reliable data to form a useful action state.')
    expect(card.textContent).not.toContain('Connect live data before using action readiness.')
    expect(card.textContent).not.toMatch(/review zones|1\.5%|3\.0%|5\.0%|7\.0%|buy signal|sell signal|entry price|stop loss|target price|take profit/i)
  })

  it('renders rule basis only in Expert Mode', () => {
    const { rerender } = render(<ActionReadinessCard plan={mockPlan} language="en" mode="simple" />)
    expect(screen.queryByRole('region', { name: 'Rule basis' })).toBeNull()
    rerender(<ActionReadinessCard plan={mockPlan} language="en" mode="expert" />)
    const basis = screen.getByRole('region', { name: 'Rule basis' })
    expect(within(basis).getByText('Data quality')).toBeTruthy()
    expect(within(basis).getByText('Movement state')).toBeTruthy()
    expect(within(basis).getByText('Candidate evidence')).toBeTruthy()
    expect(within(basis).getByText('News state')).toBeTruthy()
  })

  it('renders Korean status help without unsafe labels', () => {
    const koreanPlan: ActionReadinessPlan = {
      ...mockPlan,
      dataQualityLabel: '흐름 미리보기',
      title: '판단 보류',
      summary: '유의미한 액션 상태를 정하기에는 신뢰 가능한 데이터가 부족합니다.',
      whyThisStatus: '모의/데모 데이터를 사용하는 흐름 미리보기입니다. 시장 상황 판단이 아니라 분석 구조를 확인하는 용도로 보세요.',
      disclaimer: '액션 상태는 규칙 기반 근거 조건으로 생성되며, 거래 지시가 아닙니다.',
    }
    render(<ActionReadinessCard plan={koreanPlan} language="ko" mode="simple" />)
    const card = screen.getByRole('region', { name: '현재 액션 상태' })
    expect(within(card).getAllByText('판단 보류')).toHaveLength(1)
    expect(within(card).getByText('판단 명확도: 낮음')).toBeTruthy()
    expect(card.textContent).toContain('유의미한 액션 상태를 정하기에는 신뢰 가능한 데이터가 부족합니다.')
    expect(card.textContent).toContain('현재 규칙 기반 상태가 얼마나 명확한지를 뜻하며, 기대수익이나 확신도가 아닙니다.')
    expect(card.textContent).not.toMatch(/매수가|손절가|익절가|목표가|매수 추천/)
  })
})
