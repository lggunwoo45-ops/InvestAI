import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { SimpleModePage } from './SimpleModePage'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', providerType: 'upbit', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: 2, volume24h: 100 }
const stock: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', providerType: 'mock-krx', marketType: 'kospi', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 100 }

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: { venue, instruments: venue === 'upbit-krw' ? [crypto] : venue === 'kospi' ? [stock] : [], source: 'mock', fetchedAt: 0 }, loading: false, error: null, loadingMilliseconds: 1 }) }))
vi.mock('@/hooks/useNewsProviderMode', () => ({ useNewsProviderMode: () => ({ result: null }) }))
vi.mock('@/hooks/useOpenNewsInstrument', () => ({ useOpenNewsInstrument: () => ({ openInstrument: vi.fn(), canOpenInstrument: () => true }) }))

const renderPage = (language: 'en' | 'ko' = 'en') => {
  window.localStorage.setItem('market-copilot.language', language)
  return render(<MemoryRouter><AppProviders><SimpleModePage /></AppProviders></MemoryRouter>)
}

describe('SimpleModePage', () => {
  beforeEach(() => window.localStorage.clear())
  it('shows beginner and visible safety copy with working expert navigation', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Market Copilot Simple Mode' })).toBeTruthy()
    expect(screen.getByText(/beginner-friendly view/)).toBeTruthy()
    expect(screen.getByText(/final decision is yours/)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Open Expert Mode/ })[0].getAttribute('href')).toBe('/ai-analysis')
  })
  it('renders Korean labels', () => {
    renderPage('ko')
    expect(screen.getByRole('heading', { name: 'Market Copilot 간편모드' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '오늘의 관찰 후보' })).toBeTruthy()
    expect(screen.getAllByText('계획 참고용').length).toBeGreaterThan(0)
  })
  it('does not render unsafe recommendation phrases', () => {
    renderPage()
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed profit|profit expected|entry signal|stop loss instruction|target price instruction/)
  })
})
