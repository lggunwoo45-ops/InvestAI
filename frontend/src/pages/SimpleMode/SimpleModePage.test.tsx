import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { SimpleModePage } from './SimpleModePage'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', providerType: 'upbit', quoteCurrency: 'KRW', lastPrice: 100_000, change24hPercent: 2, volume24h: 100 }
const stock: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', providerType: 'mock-krx', marketType: 'kospi', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 100 }
const catalogControl = vi.hoisted(() => ({ cryptoError: null as string | null }))

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => venue === 'upbit-krw' && catalogControl.cryptoError ? { catalog: null, loading: false, error: catalogControl.cryptoError, loadingMilliseconds: 1 } : { catalog: { venue, instruments: venue === 'upbit-krw' ? [crypto] : venue === 'kospi' ? [stock] : [], source: 'mock', fetchedAt: 0 }, loading: false, error: null, loadingMilliseconds: 1 } }))
vi.mock('@/hooks/useNewsProviderMode', () => ({ useNewsProviderMode: () => ({ result: null }) }))
vi.mock('@/hooks/useOpenNewsInstrument', () => ({ useOpenNewsInstrument: () => ({ openInstrument: vi.fn(), canOpenInstrument: () => true }) }))

const renderPage = (language: 'en' | 'ko' = 'en') => {
  window.localStorage.setItem('market-copilot.language', language)
  return render(<MemoryRouter><AppProviders><SimpleModePage /></AppProviders></MemoryRouter>)
}

describe('SimpleModePage', () => {
  beforeEach(() => { window.localStorage.clear(); catalogControl.cryptoError = null })
  it('shows beginner safety copy and the selected Simple Mode switch', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Market Copilot Simple Mode' })).toBeTruthy()
    expect(screen.getByText(/planning and review only/)).toBeTruthy()
    const switcher = screen.getByRole('navigation', { name: 'Analysis view mode' })
    expect(within(switcher).getByRole('link', { name: /Simple Mode/ }).getAttribute('aria-current')).toBe('page')
    expect(within(switcher).getByRole('link', { name: /Expert Mode/ }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('renders Korean labels', () => {
    renderPage('ko')
    expect(screen.getByRole('heading', { name: 'Market Copilot 간편모드' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '가상자산 관찰 후보' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '주식 베타 미리보기' })).toBeTruthy()
  })
  it('separates crypto candidates from the stock beta preview', () => {
    renderPage()
    expect(screen.getByRole('region', { name: 'Crypto Watch Candidates' }).textContent).toContain('BTC/KRW')
    expect(screen.getByRole('region', { name: 'Stock Beta Preview' }).textContent).toContain('005930')
  })
  it('surfaces a crypto failure without promoting mock stocks into the crypto section', () => {
    catalogControl.cryptoError = 'Upbit unavailable'
    renderPage()
    const cryptoSection = screen.getByRole('region', { name: 'Crypto Watch Candidates' })
    expect(screen.getByRole('alert').textContent).toContain('Crypto data could not be loaded')
    expect(cryptoSection.textContent).not.toContain('005930')
    expect(screen.getByRole('region', { name: 'Stock Beta Preview' }).textContent).toContain('005930')
  })
})
