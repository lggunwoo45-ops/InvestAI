import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { DartHealthUiState } from '@/services/health/dependencyHealth'
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
  it('renders distinct non-DART states and the shared DART checking state', () => {
    render(<BetaSystemStatusPanel items={items} language="en" dartHealthState="checking" />)
    const panel = screen.getByRole('region', { name: 'Beta system status' })
    expect(panel.textContent).toContain('Market dataReady')
    expect(panel.textContent).toContain('News proxyUnavailable')
    expect(panel.textContent).toContain('DART proxyChecking')
    expect(panel.textContent).toContain('DART API keyNot checked')
    expect(panel.textContent).toContain('Real AIDisabled')
    expect(panel.textContent).toContain('no OpenDART request is made')
  })

  it('renders Korean labels and keeps disabled features neutral', () => {
    render(<BetaSystemStatusPanel items={items} language="ko" dartHealthState="checking" />)
    const panel = screen.getByRole('region', { name: '베타 시스템 상태' })
    expect(panel.textContent).toContain('실제 AI비활성화')
    expect(panel.querySelector('[data-status="disabled"]')).toBeTruthy()
  })

  it.each([
    ['en', 'checking', 'DART proxyChecking', 'DART API keyNot checked'],
    ['en', 'ready', 'DART proxyReady', 'DART API keyConfigured'],
    ['en', 'notConfigured', 'DART proxyReady', 'DART API keyNot configured'],
    ['en', 'unavailable', 'DART proxyUnavailable', 'DART API keyNot checked'],
    ['ko', 'checking', 'DART 프록시확인 중', 'DART API 키확인 전'],
    ['ko', 'ready', 'DART 프록시사용 가능', 'DART API 키설정됨'],
    ['ko', 'notConfigured', 'DART 프록시사용 가능', 'DART API 키미설정'],
    ['ko', 'unavailable', 'DART 프록시사용 불가', 'DART API 키확인 전'],
  ] as const satisfies readonly (readonly ['en' | 'ko', DartHealthUiState, string, string])[])('renders synchronized DART labels in %s for %s', (language, dartHealthState, proxyText, keyText) => {
    render(<BetaSystemStatusPanel language={language} items={[
      { id: 'dart-proxy', status: 'unavailable' },
      { id: 'dart-api-key', status: 'unknown' },
    ]} dartHealthState={dartHealthState} />)
    const panel = screen.getByRole('region', { name: language === 'ko' ? '베타 시스템 상태' : 'Beta system status' })
    expect(panel.textContent).toContain(proxyText)
    expect(panel.textContent).toContain(keyText)
  })
})
