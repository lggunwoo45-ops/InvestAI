import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { DemoPage } from './DemoPage'

const checkDartConnection = vi.hoisted(() => vi.fn())

vi.mock('@/services/dart/dartClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/dart/dartClient')>()
  return { ...actual, checkDartConnection }
})

function renderPage() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <AppProviders>
          <DemoPage />
        </AppProviders>
      </MemoryRouter>
    </StrictMode>,
  )
}

describe('DemoPage manual DART health integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('market-copilot.language', 'ko')
    window.localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    checkDartConnection.mockReset()
  })

  it('does not probe automatically and updates only API Usage after a successful click', async () => {
    checkDartConnection.mockResolvedValue({
      status: 'ready',
      apiKeyConfigured: true,
      message: 'DART API key is configured.',
    })

    renderPage()

    const systemStatus = screen.getByRole('region', { name: '베타 시스템 상태' })
    const apiUsage = screen.getByRole('region', { name: 'API 사용 상태' })
    expect(within(systemStatus).queryByText('DART 프록시')).toBeNull()
    expect(within(systemStatus).queryByText('DART API 키')).toBeNull()
    expect(within(apiUsage).getByText('DART 연결 상태를 아직 확인하지 않았습니다.')).toBeTruthy()
    expect(checkDartConnection).not.toHaveBeenCalled()

    fireEvent.click(within(apiUsage).getByRole('button', { name: 'DART 연결 확인' }))
    await waitFor(() => {
      expect(within(apiUsage).getByText('DART 프록시:').closest('li')?.textContent).toBe('DART 프록시: 사용 가능')
      expect(within(apiUsage).getByText('DART API 키:').closest('li')?.textContent).toBe('DART API 키: 설정됨')
    })
    expect(checkDartConnection).toHaveBeenCalledTimes(1)
    expect(within(systemStatus).queryByText('DART 프록시')).toBeNull()
  })

  it('shows a connection failure only after the user starts a failed check', async () => {
    checkDartConnection.mockRejectedValue(new TypeError('offline'))
    renderPage()

    const apiUsage = screen.getByRole('region', { name: 'API 사용 상태' })
    expect(within(apiUsage).queryByText('DART 프록시:')).toBeNull()

    fireEvent.click(within(apiUsage).getByRole('button', { name: 'DART 연결 확인' }))
    await waitFor(() => {
      expect(within(apiUsage).getByText('DART 프록시:').closest('li')?.textContent).toBe('DART 프록시: 연결 실패')
      expect(within(apiUsage).getByText('DART API 키:').closest('li')?.textContent).toBe('DART API 키: 확인 불가')
    })
    expect(apiUsage.textContent).not.toContain('offline')
  })
})
