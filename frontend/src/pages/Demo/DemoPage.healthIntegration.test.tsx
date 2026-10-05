import { StrictMode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { dartClient } from '@/services/dart/dartClient'
import { DemoPage } from './DemoPage'

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

describe('DemoPage DART health integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('market-copilot.language', 'ko')
    window.localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    vi.restoreAllMocks()
  })

  it('updates both status panels from the real health hook after a ready response', async () => {
    const loadHealth = vi.spyOn(dartClient, 'loadHealth').mockResolvedValue({
      status: 'ready',
      apiKeyConfigured: true,
      message: 'DART API key is configured.',
    })

    renderPage()

    const systemStatus = screen.getByRole('region', { name: '베타 시스템 상태' })
    const apiUsage = screen.getByRole('region', { name: 'API 사용 상태' })
    expect(within(systemStatus).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키확인 전')
    expect(within(apiUsage).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키확인 전')

    await waitFor(() => {
      expect(within(systemStatus).getByText('DART 프록시').closest('li')?.textContent).toBe('DART 프록시사용 가능')
      expect(within(systemStatus).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키설정됨')
      expect(within(apiUsage).getByText('DART 프록시').closest('li')?.textContent).toBe('DART 프록시사용 가능')
      expect(within(apiUsage).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키설정됨')
    })

    expect(within(systemStatus).queryByText('확인 전')).toBeNull()
    expect(within(apiUsage).queryByText('확인 전')).toBeNull()
    expect(loadHealth).toHaveBeenCalled()
  })
})
