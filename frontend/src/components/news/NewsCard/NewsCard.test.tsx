import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { newsArticles } from '@/services/dashboard/mockDashboardData'
import { NewsCard } from './NewsCard'

function renderArticle(url: string) {
  render(<MemoryRouter><AppProviders><NewsCard article={{ ...newsArticles[0], url }} /></AppProviders></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Read details' }))
}

describe('NewsCard external links', () => {
  it('reveals source, time, category, sentiment, importance, markets and symbols on expansion', () => {
    renderArticle('javascript:alert(1)')
    expect(screen.getByText(newsArticles[0].title)).toBeTruthy()
    expect(screen.getAllByText('InvestAI Demo Desk').length).toBeGreaterThan(0)
    expect(screen.getByText('Sentiment')).toBeTruthy()
    expect(screen.getByText('Importance')).toBeTruthy()
    expect(screen.getByText('Related Markets')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open in Market: BTC/KRW' })).toBeTruthy()
    expect(screen.getAllByText(/Demo news \/ Mock data/).length).toBeGreaterThan(0)
  })
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///secret', 'http://example.com'])('blocks unsafe URL %s', (url) => {
    renderArticle(url)
    expect(screen.queryByRole('link', { name: /Open source article/ })).toBeNull()
  })

  it('opens an allowed HTTPS source with isolation attributes', () => {
    renderArticle('https://example.com/news')
    const link = screen.getByRole('link', { name: /Open source article/ })
    expect(link.getAttribute('href')).toBe('https://example.com/news')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })
})
