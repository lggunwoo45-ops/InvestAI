import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', koreanName: '비트코인', englishName: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 1000 },
  { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung Electronics', koreanName: '삼성전자', englishName: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70000, change24hPercent: 1, volume24h: 5000 },
]

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: { venue, source: venue === 'upbit-krw' ? 'live' : 'mock', fetchedAt: 0, instruments: instruments.filter((item) => item.marketType === venue) }, loading: false, error: null, loadingMilliseconds: 0 }) }))

describe('MyAnalysisPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts empty, selects an instrument, and switches the global detail level', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'My Instrument Analysis' })).toBeTruthy()
    expect(screen.getByText('Search and select an instrument to begin.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    fireEvent.click(screen.getByRole('option', { name: /005930/ }))
    expect(screen.getByRole('heading', { name: '005930' })).toBeTruthy()
    expect(screen.getByText('Mock / demo data')).toBeTruthy()
    expect(screen.getAllByText(/Stock movement is simulated demo context/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Expert view' }))
    expect(screen.getByRole('heading', { name: 'Evidence board' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Missing evidence' })).toBeTruthy()
  })

  it('supports direct instrument query selection and bilingual navigation', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Analyze' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })
    expect(screen.getByRole('link', { name: '종목 분석' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '내 종목 분석' })).toBeTruthy()
  })
})
