import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildNewsInsight } from '@/services/news/newsInsightEngine'
import { newsArticles } from '@/services/dashboard/mockDashboardData'
import { NewsInsightPanel } from './NewsInsightPanel'

describe('NewsInsightPanel', () => {
  it('shows the required transparent insight sections', () => {
    const insight = buildNewsInsight({ article: newsArticles[0], availableInstruments: [{ id: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin' }], language: 'en' })
    render(<NewsInsightPanel insight={insight} language="en" />)
    expect(screen.getByText('Original headline')).toBeTruthy()
    expect(screen.getByText('Key issue')).toBeTruthy()
    expect(screen.getByText('Market impact')).toBeTruthy()
    expect(screen.getByText('Review horizons')).toBeTruthy()
    expect(screen.getByText('Risks & caveats')).toBeTruthy()
    expect(screen.getByText(/REAL AI DISCONNECTED/)).toBeTruthy()
  })
  it('keeps all planned AI actions disabled and makes no request', () => {
    const request = vi.spyOn(globalThis, 'fetch')
    const insight = buildNewsInsight({ article: newsArticles[0], language: 'en' })
    render(<NewsInsightPanel insight={insight} language="en" />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    buttons.forEach((button) => { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button) })
    expect(request).not.toHaveBeenCalled()
    request.mockRestore()
  })
})
