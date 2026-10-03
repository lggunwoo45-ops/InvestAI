import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ApiUsageItem } from '@/services/health/dependencyHealth'
import { ApiUsageStatusPanel } from './ApiUsageStatusPanel'

const configured: readonly ApiUsageItem[] = [
  { id: 'news-proxy', status: 'active' },
  { id: 'dart-proxy', status: 'active' },
  { id: 'dart-api-key', status: 'active' },
  { id: 'real-ai', status: 'disabled' },
  { id: 'trading', status: 'disabled' },
]

const unconfigured: readonly ApiUsageItem[] = [
  { id: 'news-proxy', status: 'unavailable' },
  { id: 'dart-proxy', status: 'active' },
  { id: 'dart-api-key', status: 'notConfigured' },
  { id: 'real-ai', status: 'disabled' },
  { id: 'trading', status: 'disabled' },
]

describe('ApiUsageStatusPanel', () => {
  it('renders configured and intentionally disabled English states without a key value', () => {
    render(<ApiUsageStatusPanel items={configured} language="en" />)
    const panel = screen.getByRole('region', { name: 'API usage status' })
    expect(panel.textContent).toContain('News proxyActive')
    expect(panel.textContent).toContain('DART proxyActive')
    expect(panel.textContent).toContain('DART API keyActive')
    expect(panel.textContent).toContain('Real AIDisabled')
    expect(panel.textContent).toContain('TradingDisabled')
    expect(panel.textContent).toContain('Key value is never displayed.')
    expect(panel.textContent).not.toMatch(/test-only-key|crtfc_key|DART_API_KEY=/)
  })

  it('renders exact Korean labels and safe unavailable states', () => {
    render(<ApiUsageStatusPanel items={unconfigured} language="ko" />)
    const panel = screen.getByRole('region', { name: 'API 사용 상태' })
    expect(panel.textContent).toContain('뉴스 프록시연결 불가')
    expect(panel.textContent).toContain('DART 프록시사용 중')
    expect(panel.textContent).toContain('DART API 키미설정')
    expect(panel.textContent).toContain('실제 AI비활성화')
    expect(panel.textContent).toContain('거래 기능비활성화')
    expect(panel.textContent).toContain('키 값은 표시하지 않습니다.')
    expect(panel.textContent).toContain('현재 개인 거래소 API, 증권사 API, 실제 AI API는 사용하지 않습니다.')
  })
})
