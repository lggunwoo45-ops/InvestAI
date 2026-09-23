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
  { id: 'us-aapl', marketId: 'us-stock', marketType: 'nasdaq', providerType: 'mock-us', symbol: 'AAPL', name: 'Apple', englishName: 'Apple', quoteCurrency: 'USD', lastPrice: 230, change24hPercent: -1, volume24h: 6000 },
  { id: 'binance-spot-btcusdt', marketId: 'binance-spot', marketType: 'binance-spot', providerType: 'binance-spot', symbol: 'BTCUSDT', name: 'Bitcoin / Tether', englishName: 'Bitcoin / Tether', quoteCurrency: 'USDT', lastPrice: 95000, change24hPercent: -9, volume24h: 9000 },
]

vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: catalogMockState.failedVenue === venue ? null : { venue, source: venue === 'upbit-krw' ? 'live' : 'mock', fetchedAt: 0, instruments: instruments.filter((item) => item.marketType === venue) }, loading: false, error: catalogMockState.failedVenue === venue ? 'Catalog failed' : null, loadingMilliseconds: 0 }) }))

describe('MyAnalysisPage', () => {
  beforeEach(() => { window.localStorage.clear(); catalogMockState.failedVenue = null })

  it('starts empty, selects an instrument, and switches the global detail level', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'My Instrument Analysis' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Start by selecting a coin or stock.' })).toBeTruthy()
    expect(screen.getByText('Search an asset')).toBeTruthy()
    expect(screen.getByText('Choose review intent')).toBeTruthy()
    expect(screen.getByText('Read Simple or Expert result')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    fireEvent.click(screen.getByRole('button', { name: /005930/ }))
    expect(screen.getByRole('heading', { name: '005930' })).toBeTruthy()
    expect(screen.getByText('Mock / demo data')).toBeTruthy()
    expect(screen.getByText(/This stock analysis is a structure preview/)).toBeTruthy()
    expect(screen.getByText('Current stock movement is demo context.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What is visible now' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What stands out' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Risks and limits' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Next checks' })).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'Personal review note' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '68000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Expert view' }))
    expect(screen.getByRole('heading', { name: 'Evidence board' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Missing evidence' })).toBeTruthy()
    expect(screen.getAllByText('Demo').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Missing').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Source: mock catalog').length).toBeGreaterThan(1)
    expect(screen.getAllByText(/Evidence type:/).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/This evidence is not connected yet and should not be inferred./).length).toBeGreaterThan(1)
    const userInputs = screen.getByRole('region', { name: 'Your inputs' })
    expect(within(userInputs).getByText('Personal review note')).toBeTruthy()
    expect(within(userInputs).getByText('68,000 KRW')).toBeTruthy()
    expect(within(userInputs).getByText('User-provided context only. Not market evidence.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch to Simple view' })).toBeTruthy()
  })

  it('filters loaded search results by Crypto, Korea, and US without new provider calls', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    const search = await screen.findByRole('searchbox', { name: 'Search instrument' })
    fireEvent.change(search, { target: { value: 'Bitcoin' } })
    expect(screen.getByRole('button', { name: /BTC\/KRW/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Crypto' }))
    expect(screen.getByRole('button', { name: /BTC\/KRW/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Korea' }))
    fireEvent.change(search, { target: { value: 'Samsung' } })
    expect(screen.getByRole('button', { name: /005930/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'US' }))
    fireEvent.change(search, { target: { value: 'Apple' } })
    expect(screen.getByRole('button', { name: /AAPL/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /BTC\/KRW/ })).toBeNull()
  })

  it('supports direct instrument query selection and bilingual navigation', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTC/KRW' })).toBeTruthy()
    expect(screen.getByText(/moderate upward movement/)).toBeTruthy()
    expect(screen.getByText('Opened from Market workspace.')).toBeTruthy()
    expect(screen.getByText('Live public market data')).toBeTruthy()
    expect(screen.getByText('Optional personal context')).toBeTruthy()
    expect(screen.getByText('Review intent changes checklist wording only.')).toBeTruthy()
    expect(screen.getByText('Next checks')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'My Analysis' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })
    expect(screen.getByRole('link', { name: '내 종목 분석' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '내 종목 분석' })).toBeTruthy()
    expect(screen.getByText('마켓 작업공간에서 이동했습니다.')).toBeTruthy()
    expect(screen.getByText('선택 개인 참고 정보')).toBeTruthy()
    expect(screen.getByText('검토 목적은 체크리스트 문구만 바꿉니다.')).toBeTruthy()
    expect(screen.getByText('검토 목적은 체크리스트 문구만 바꾸며 개인 투자 조언을 생성하지 않습니다.')).toBeTruthy()
  })

  it('resolves a Binance Market link through the existing catalog', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=binance-spot-btcusdt']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'BTCUSDT' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Mock / demo data')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/strong buy|buy signal|sell signal|entry price|stop loss|target price|guaranteed profit|profit expected/i)
  })

  it('surfaces a venue failure while keeping loaded catalogs searchable', async () => {
    catalogMockState.failedVenue = 'binance-futures'
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=missing-instrument']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect((await screen.findByRole('status', { name: 'Catalog limitation' })).textContent).toContain('Some market catalogs could not be loaded. Search results may be incomplete.')
    expect(screen.getByRole('alert').textContent).toContain('The requested instrument is not available in the loaded catalogs.')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    expect(screen.getByRole('button', { name: /005930/ })).toBeTruthy()
  })
})
