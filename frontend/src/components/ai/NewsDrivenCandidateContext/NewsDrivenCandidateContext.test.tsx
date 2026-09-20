import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { newsArticles } from '@/services/dashboard/mockDashboardData'
import { buildNewsInsight } from '@/services/news/newsInsightEngine'
import { NewsDrivenCandidateContext } from './NewsDrivenCandidateContext'

describe('NewsDrivenCandidateContext', () => {
  it('shows at most three rule-based contexts and makes macro scope explicit', () => {
    const available = [{ id: 'upbit-btc', symbol: 'BTC/KRW', name: 'Bitcoin' }]
    const insights = [newsArticles[4], ...newsArticles.slice(0, 4)].map((article) => buildNewsInsight({ article, availableInstruments: available, language: 'en' }))
    render(<NewsDrivenCandidateContext insights={insights} language="en" />)
    expect(screen.getByText('News-driven candidate context')).toBeTruthy()
    expect(screen.getByText(/macro news remains market-level context/)).toBeTruthy()
    expect(screen.getAllByLabelText('News Insight')).toHaveLength(3)
  })
})
