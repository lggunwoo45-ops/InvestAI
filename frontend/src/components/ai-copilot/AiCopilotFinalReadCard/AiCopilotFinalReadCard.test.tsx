import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import { AiCopilotFinalReadCard } from './AiCopilotFinalReadCard'

const result: AiCopilotFinalRead = {
  state: 'keepWatching',
  title: 'Keep watching',
  summary: 'Keep this in view and check whether the current flow remains consistent.',
  why: 'The evidence supports continued observation.',
  nextCheck: 'Check whether the flow remains consistent.',
  caution: 'Decision-support information, not a trade instruction.',
  confidenceLabel: 'Medium',
  sourceFactors: ['Practical decision', 'Technical levels'],
  evidenceSummary: ['Review score: 62', 'Technical trend: Mixed'],
  evidenceItems: [
    { key: 'score', label: 'Review score', value: '62', status: 'constructive', statusLabel: 'Constructive' },
    { key: 'trend', label: 'Technical trend', value: 'Mixed', status: 'neutral', statusLabel: 'Neutral' },
    { key: 'momentum', label: 'Momentum', value: 'Neutral', status: 'neutral', statusLabel: 'Neutral' },
    { key: 'volume', label: 'Volume', value: 'Normal', status: 'neutral', statusLabel: 'Neutral' },
    { key: 'quality', label: 'Data quality', value: 'Live', status: 'strong', statusLabel: 'Strong' },
  ],
}

describe('AiCopilotFinalReadCard', () => {
  it('renders the English conclusion, reason, next check, and compact caution', () => {
    render(<AiCopilotFinalReadCard result={result} language="en" />)
    const card = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(card.textContent).toContain('Final read')
    expect(card.textContent).toContain('Keep watching')
    expect(card.textContent).toContain('Key reason')
    expect(card.textContent).toContain('Next check')
    expect(card.textContent).toContain('Why this state')
    expect(card.textContent).toContain('Evidence')
    expect(card.textContent).toContain('Review score')
    expect(card.textContent).toContain('Constructive')
    expect(card.textContent).not.toContain('Data quality')
    expect(screen.getByRole('button', { name: 'Show evidence details' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Show evidence details' }))
    expect(screen.getByRole('button', { name: 'Hide evidence details' }).getAttribute('aria-expanded')).toBe('true')
    expect(card.textContent).toContain('Data quality')
    expect(card.textContent).toContain('Source factors')
    expect(card.textContent).toContain('Decision-support information, not a trade instruction.')
  })

  it('renders Korean labels without prohibited order wording', () => {
    render(<AiCopilotFinalReadCard result={{ ...result, title: '관심 유지', summary: '관심 후보로 유지하고 흐름을 더 확인할 단계입니다.', why: '계속 확인할 근거가 있습니다.', nextCheck: '현재 흐름이 유지되는지 확인하세요.', caution: '판단 보조 정보이며 거래 지시가 아닙니다.', confidenceLabel: '보통', sourceFactors: ['실용 판단'], evidenceSummary: ['검토 점수: 62', '기술 상태: 혼재'], evidenceItems: [{ key: 'score', label: '검토 점수', value: '62', status: 'constructive', statusLabel: '우호적' }, { key: 'quality', label: '데이터 품질', value: '실시간', status: 'strong', statusLabel: '강함' }] }} language="ko" />)
    const card = screen.getByRole('region', { name: 'AI 코파일럿 최종 검토' })
    expect(card.textContent).toContain('최종 검토 판단')
    expect(card.textContent).toContain('관심 유지')
    expect(card.textContent).toContain('핵심 이유')
    expect(card.textContent).toContain('다음 확인')
    expect(card.textContent).toContain('판단 근거')
    expect(card.textContent).toContain('판단 근거 자세히 보기')
    expect(card.textContent).not.toContain('BTC 기준')
    expect(card.textContent).not.toMatch(/매수|매도|매수가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
})
