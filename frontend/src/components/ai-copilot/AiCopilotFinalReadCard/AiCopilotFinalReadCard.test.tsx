import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import { AiCopilotFinalReadCard } from './AiCopilotFinalReadCard'

const result: AiCopilotFinalRead = {
  state: 'keepWatching',
  title: 'Final review: Keep watching',
  summary: 'Keep this in view and check whether the current flow remains consistent.',
  why: 'The evidence supports continued observation.',
  nextCheck: 'Check whether the flow remains consistent.',
  caution: 'Decision-support information, not a trade instruction.',
  confidenceLabel: 'Medium',
  sourceFactors: ['Practical decision', 'Technical levels'],
}

describe('AiCopilotFinalReadCard', () => {
  it('renders the English conclusion, reason, next check, and compact caution', () => {
    render(<AiCopilotFinalReadCard result={result} language="en" />)
    const card = screen.getByRole('region', { name: 'AI Copilot final review' })
    expect(card.textContent).toContain('Final review: Keep watching')
    expect(card.textContent).toContain('Reason')
    expect(card.textContent).toContain('Next check')
    expect(card.textContent).toContain('Decision-support information, not a trade instruction.')
  })

  it('renders Korean labels without prohibited order wording', () => {
    render(<AiCopilotFinalReadCard result={{ ...result, title: '최종 검토 판단: 관심 유지', summary: '관심 후보로 유지하고 흐름을 더 확인할 단계입니다.', why: '계속 관찰할 근거가 확인되었습니다.', nextCheck: '현재 흐름이 유지되는지 확인하세요.', caution: '판단 보조 정보이며 거래 지시가 아닙니다.', confidenceLabel: '보통', sourceFactors: ['실용 판단'] }} language="ko" />)
    const card = screen.getByRole('region', { name: 'AI 코파일럿 최종 검토' })
    expect(card.textContent).toContain('최종 검토 판단: 관심 유지')
    expect(card.textContent).toContain('이유')
    expect(card.textContent).toContain('다음 확인')
    expect(card.textContent).not.toMatch(/매수|매도|매수가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
  })
})
