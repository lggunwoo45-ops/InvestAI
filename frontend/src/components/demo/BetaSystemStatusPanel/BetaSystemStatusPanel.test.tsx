import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { DependencyHealthItem } from '@/services/health/dependencyHealth'
import { BetaSystemStatusPanel } from './BetaSystemStatusPanel'

const items: readonly DependencyHealthItem[] = [
  { id: 'market-data', status: 'ready' },
  { id: 'news-proxy', status: 'unavailable' },
  { id: 'dart-proxy', status: 'unavailable' },
  { id: 'dart-api-key', status: 'unknown' },
  { id: 'real-ai', status: 'disabled' },
  { id: 'trading', status: 'disabled' },
]

describe('BetaSystemStatusPanel', () => {
  it('keeps runtime DART state out of the static dependency rows', () => {
    render(<BetaSystemStatusPanel items={items} language="ko" />)
    const panel = screen.getByRole('region', { name: '베타 시스템 상태' })

    expect(within(panel).queryByText('DART 프록시')).toBeNull()
    expect(within(panel).queryByText('DART API 키')).toBeNull()
    expect(panel.textContent).not.toContain('DART 프록시사용 불가')
    expect(panel.textContent).not.toContain('DART API 키확인 전')
    expect(within(panel).getByText('DART 상태는 아래 API 사용 상태에서 직접 확인할 수 있습니다.')).toBeTruthy()
  })

  it('renders static product readiness and the English DART guidance', () => {
    render(<BetaSystemStatusPanel items={items} language="en" />)
    const panel = screen.getByRole('region', { name: 'Beta system status' })

    expect(panel.textContent).toContain('Market dataReady')
    expect(panel.textContent).toContain('News proxyUnavailable')
    expect(panel.textContent).toContain('Real AIDisabled')
    expect(within(panel).getByText('DART status can be checked directly in the API Usage Status section below.')).toBeTruthy()
    expect(within(panel).queryByText('DART proxy')).toBeNull()
    expect(within(panel).queryByText('DART API key')).toBeNull()
  })
})
