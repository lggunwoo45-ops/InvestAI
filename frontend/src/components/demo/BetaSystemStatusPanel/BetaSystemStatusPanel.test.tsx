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
    expect(panel.textContent).toContain('DART proxyNot checked')
    expect(panel.textContent).toContain('DART API keyLimited')
    expect(panel.textContent).toContain('Real AIDisabled')
    expect(panel.textContent).toContain('no OpenDART request is made')
  })

  it('renders Korean labels and keeps disabled features neutral', () => {
    render(<BetaSystemStatusPanel items={items} language="ko" />)
    const panel = screen.getByRole('region', { name: '베타 시스템 상태' })
    expect(panel.textContent).toContain('실제 AI비활성화')
    expect(panel.querySelector('[data-status="disabled"]')).toBeTruthy()
  })

  it.each([
    ['en', 'ready', 'ready', 'DART proxyReady', 'DART API keyConfigured'],
    ['en', 'ready', 'disabled', 'DART proxyReady', 'DART API keyNot configured'],
    ['en', 'unavailable', 'unknown', 'DART proxyUnavailable', 'DART API keyNot checked'],
    ['ko', 'ready', 'ready', 'DART 프록시사용 가능', 'DART API 키설정됨'],
    ['ko', 'ready', 'disabled', 'DART 프록시사용 가능', 'DART API 키미설정'],
    ['ko', 'unavailable', 'unknown', 'DART 프록시사용 불가', 'DART API 키확인 전'],
  ] as const)('renders synchronized DART labels in %s for %s/%s', (language, proxyStatus, keyStatus, proxyText, keyText) => {
    render(<BetaSystemStatusPanel language={language} items={[
      { id: 'dart-proxy', status: proxyStatus },
      { id: 'dart-api-key', status: keyStatus },
    ]} />)
    const panel = screen.getByRole('region', { name: language === 'ko' ? '베타 시스템 상태' : 'Beta system status' })
    expect(panel.textContent).toContain(proxyText)
    expect(panel.textContent).toContain(keyText)
  })
})
