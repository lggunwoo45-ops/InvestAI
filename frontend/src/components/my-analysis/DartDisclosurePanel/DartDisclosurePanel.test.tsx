import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { dartMockResult } from '@/services/dart/dartFixtures'
import type { DartDisclosureResult } from '@/types/dart'
import { DartDisclosurePanel } from './DartDisclosurePanel'

const state = (status: DartDisclosureResult['status']): DartDisclosureResult => ({ status, sourceMode: 'disabled', message: '', disclosures: [], fetchedAt: null })

describe('DartDisclosurePanel', () => {
  it('renders disabled and mapping-unavailable states safely', () => {
    const { rerender } = render(<DartDisclosurePanel language="en" result={state('disabled')} />)
    expect(screen.getByRole('status').textContent).toContain('DART API key is not configured')
    rerender(<DartDisclosurePanel language="en" result={state('mapping_unavailable')} />)
    expect(screen.getByRole('status').textContent).toContain('corporation code mapping')
  })

  it('renders disclosure evidence and Korean labels without unsafe interpretation', () => {
    render(<DartDisclosurePanel language="ko" result={dartMockResult} />)
    const panel = screen.getByRole('region', { name: '최근 DART 공시' })
    expect(panel.textContent).toContain('분기보고서 (모의 자료)')
    expect(panel.textContent).toContain('정기')
    expect(panel.textContent).toContain('공시 제목은 근거 자료로만 표시됩니다.')
    expect(panel.textContent).not.toMatch(/매수|매도|목표가|손절가|익절가|긍정 공시|부정 공시/)
  })
})
