import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'

const catalogMockState = vi.hoisted(() => ({ failedVenue: null as string | null }))

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', koreanName: '비트코인', englishName: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 1000 },
  { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung Electronics', koreanName: '삼성전자', englishName: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70000, change24hPercent: 1, volume24h: 5000 },
  { id: 'binance-spot-btcusdt', marketId: 'binance-spot', marketType: 'binance-spot', providerType: 'binance-spot', symbol: 'BTCUSDT', name: 'Bitcoin / Tether', englishName: 'Bitcoin / Tether', quoteCurrency: 'USDT', lastPrice: 95000, change24hPercent: -9, volume24h: 9000 },
]

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: catalogMockState.failedVenue === venue ? null : { venue, source: venue === 'upbit-krw' ? 'live' : 'mock', fetchedAt: 0, instruments: instruments.filter((item) => item.marketType === venue) }, loading: false, error: catalogMockState.failedVenue === venue ? 'Catalog failed' : null, loadingMilliseconds: 0 }) }))

describe('MyAnalysisPage', () => {
  beforeEach(() => { window.localStorage.clear(); catalogMockState.failedVenue = null })

  it('starts empty, selects an instrument, and switches the global detail level', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'My Instrument Analysis' })).toBeTruthy()
    expect(screen.getByText('Search and select an instrument to begin.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    fireEvent.click(screen.getByRole('button', { name: /005930/ }))
    expect(screen.getByRole('heading', { name: '005930' })).toBeTruthy()
    expect(screen.getByText('Mock / demo data')).toBeTruthy()
    expect(screen.getAllByText('Simulated market value is shown for workflow testing.').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'Personal review note' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '68000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Expert view' }))
    expect(screen.getByRole('heading', { name: 'Evidence board' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Missing evidence' })).toBeTruthy()
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Missing').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Source: mock catalog').length).toBeGreaterThan(1)
    const userInputs = screen.getByRole('region', { name: 'Your inputs' })
    expect(within(userInputs).getByText('Personal review note')).toBeTruthy()
    expect(within(userInputs).getByText('68,000 KRW')).toBeTruthy()
    expect(within(userInputs).getByText('User-provided context only. Not market evidence.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch to Simple view' })).toBeTruthy()
  })

  it('supports direct instrument query selection and bilingual navigation', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'My Analysis' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })
    expect(screen.getByRole('link', { name: '내 종목 분석' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '내 종목 분석' })).toBeTruthy()
    expect(screen.getByText('검토 목적은 체크리스트 문구만 바꾸며 개인 투자 조언을 생성하지 않습니다.')).toBeTruthy()
  })

  it('resolves a Binance Market link through the existing catalog', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=binance-spot-btcusdt']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTCUSDT' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Mock / demo data')).toBeTruthy()
  })

  it('surfaces a venue failure while keeping loaded catalogs searchable', async () => {
    catalogMockState.failedVenue = 'binance-futures'
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=missing-instrument']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect((await screen.findByRole('status', { name: 'Market catalog limitation' })).textContent).toContain('Some market catalogs could not be loaded. Search results may be incomplete.')
    expect(screen.getByRole('alert').textContent).toContain('The requested instrument is not available in the loaded catalogs.')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    expect(screen.getByRole('button', { name: /005930/ })).toBeTruthy()
  })
})
