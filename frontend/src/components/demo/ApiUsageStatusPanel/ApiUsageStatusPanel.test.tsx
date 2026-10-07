import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ApiUsageItem } from '@/services/health/dependencyHealth'
import type { DartProxyHealthResult } from '@/types/dart'
import { ApiUsageStatusPanel } from './ApiUsageStatusPanel'

const items: readonly ApiUsageItem[] = [
  { id: 'news-proxy', status: 'active' },
  { id: 'dart-proxy', status: 'unavailable' },
  { id: 'dart-api-key', status: 'unknown' },
  { id: 'real-ai', status: 'disabled' },
  { id: 'trading', status: 'disabled' },
]

describe('ApiUsageStatusPanel', () => {
  it('starts unchecked without running an automatic DART request', () => {
    const checkDartConnection = vi.fn()
    render(<ApiUsageStatusPanel items={items} language="ko" checkDartConnection={checkDartConnection} />)
    const panel = screen.getByRole('region', { name: 'API 사용 상태' })

    expect(within(panel).getByRole('button', { name: 'DART 연결 확인' })).toBeTruthy()
    expect(within(panel).getByText('DART 연결 상태를 아직 확인하지 않았습니다.')).toBeTruthy()
    expect(within(panel).getByText('확인 경로: /api/dart/health')).toBeTruthy()
    expect(within(panel).getByText('키 값은 표시하지 않습니다.')).toBeTruthy()
    expect(panel.textContent).not.toContain('DART 프록시연결 불가')
    expect(checkDartConnection).not.toHaveBeenCalled()
  })

  it('shows checking, then ready and configured after a successful manual request', async () => {
    let resolveCheck!: (value: DartProxyHealthResult) => void
    const pending = new Promise<DartProxyHealthResult>((resolve) => { resolveCheck = resolve })
    const checkDartConnection = vi.fn(() => pending)
    render(<ApiUsageStatusPanel items={items} language="ko" checkDartConnection={checkDartConnection} />)
    const panel = screen.getByRole('region', { name: 'API 사용 상태' })
    const button = within(panel).getByRole('button', { name: 'DART 연결 확인' })

    fireEvent.click(button)
    expect(within(panel).getByText('DART 연결 확인 중...')).toBeTruthy()
    expect(button).toHaveProperty('disabled', true)

    await act(async () => {
      resolveCheck({ status: 'ready', apiKeyConfigured: true, message: 'DART_API_KEY=test-only-key' })
      await pending
    })

    expect(within(panel).getByText('DART 프록시:').closest('li')?.textContent).toBe('DART 프록시: 사용 가능')
    expect(within(panel).getByText('DART API 키:').closest('li')?.textContent).toBe('DART API 키: 설정됨')
    expect(panel.textContent).not.toContain('test-only-key')
    expect(checkDartConnection).toHaveBeenCalledTimes(1)
  })

  it('shows a reachable proxy and an unconfigured key from a manual response', async () => {
    const checkDartConnection = vi.fn().mockResolvedValue({ status: 'disabled', apiKeyConfigured: false, message: 'Not configured.' })
    render(<ApiUsageStatusPanel items={items} language="en" checkDartConnection={checkDartConnection} />)
    const panel = screen.getByRole('region', { name: 'API usage status' })

    fireEvent.click(within(panel).getByRole('button', { name: 'Check DART connection' }))
    await waitFor(() => {
      expect(within(panel).getByText('DART proxy:').closest('li')?.textContent).toBe('DART proxy: Ready')
      expect(within(panel).getByText('DART API key:').closest('li')?.textContent).toBe('DART API key: Not configured')
    })
    expect(within(panel).getByText('Endpoint: /api/dart/health')).toBeTruthy()
    expect(within(panel).getByText('Key value is never displayed.')).toBeTruthy()
  })

  it('shows connection failed and could not be checked only after a failed manual request', async () => {
    const checkDartConnection = vi.fn().mockRejectedValue(new TypeError('offline'))
    render(<ApiUsageStatusPanel items={items} language="ko" checkDartConnection={checkDartConnection} />)
    const panel = screen.getByRole('region', { name: 'API 사용 상태' })

    fireEvent.click(within(panel).getByRole('button', { name: 'DART 연결 확인' }))
    await waitFor(() => {
      expect(within(panel).getByText('DART 프록시:').closest('li')?.textContent).toBe('DART 프록시: 연결 실패')
      expect(within(panel).getByText('DART API 키:').closest('li')?.textContent).toBe('DART API 키: 확인 불가')
    })
    expect(panel.textContent).not.toContain('offline')
  })
})
