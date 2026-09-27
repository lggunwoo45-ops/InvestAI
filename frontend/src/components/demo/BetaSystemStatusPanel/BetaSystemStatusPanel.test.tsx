import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BetaSystemStatusPanel } from './BetaSystemStatusPanel'

const items = [
  { id: 'market-data', status: 'ready' },
  { id: 'news-proxy', status: 'unavailable' },
  { id: 'dart-proxy', status: 'unknown' },
  { id: 'dart-api-key', status: 'limited' },
  { id: 'real-ai', status: 'disabled' },
  { id: 'trading', status: 'disabled' },
] as const

describe('BetaSystemStatusPanel', () => {
  it('renders distinct ready, unavailable, configuration, limited, and disabled states', () => {
    render(<BetaSystemStatusPanel items={items} language="en" />)
    const panel = screen.getByRole('region', { name: 'Beta system status' })
    expect(panel.textContent).toContain('Market dataReady')
    expect(panel.textContent).toContain('News proxyUnavailable')
    expect(panel.textContent).toContain('DART proxyConfiguration needed')
    expect(panel.textContent).toContain('DART API keyLimited')
    expect(panel.textContent).toContain('Real AIDisabled')
    expect(panel.textContent).toContain('does not run additional network checks')
  })

  it('renders Korean labels and keeps disabled features neutral', () => {
    render(<BetaSystemStatusPanel items={items} language="ko" />)
    const panel = screen.getByRole('region', { name: '베타 시스템 상태' })
    expect(panel.textContent).toContain('실제 AI비활성화')
    expect(panel.querySelector('[data-status="disabled"]')).toBeTruthy()
  })
})
