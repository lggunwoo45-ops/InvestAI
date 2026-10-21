import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writePortfolio } from '@/services/portfolio/portfolioStorage'
import { PortfolioSummaryCard } from './PortfolioSummaryCard'

const at = 1_800_000_000_000
const state = vi.hoisted(() => ({ source: 'live', failed: false }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: 'live' }) }))
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: string) => ({ loading: false, error: state.failed ? 'offline' : null, catalog: { source: state.source, fetchedAt: 1_800_000_000_000, instruments: [{ id: venue, quoteCurrency: venue === 'upbit-krw' ? 'KRW' : 'USDT', lastPrice: 120 }] } }) }))
describe('home portfolio totals', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(at); state.source = 'live'; state.failed = false })
  afterEach(() => vi.useRealTimers())
  it('uses saved holdings, separates currencies, and removes valuation when quotes expire', () => {
    writePortfolio([
      { id: '1', instrumentId: 'upbit-krw', venue: 'upbit-krw', exchange: 'upbit', symbol: 'BTC', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2 },
      { id: '2', instrumentId: 'binance-spot', venue: 'binance-spot', exchange: 'binance', symbol: 'ETH', quoteCurrency: 'USDT', averagePrice: 110, quantity: 1 },
    ], null)
    render(<MemoryRouter><PortfolioSummaryCard /></MemoryRouter>)
    expect(screen.getByText('보유 기록 2개')).toBeTruthy()
    expect(screen.getByText('240')).toBeTruthy()
    expect(screen.getByText('120')).toBeTruthy()
    expect(screen.queryByText('360')).toBeNull()
    act(() => { vi.advanceTimersByTime(95000) })
    expect(screen.queryByText('240')).toBeNull()
    expect(screen.getAllByText('최신 시세가 부족해 합계를 표시하지 않아요.')).toHaveLength(2)
  })
  it('does not replace failed live quotes with mock numbers or an unreadable portfolio with an empty state', () => {
    writePortfolio([{ id: '1', instrumentId: 'upbit-krw', venue: 'upbit-krw', exchange: 'upbit', symbol: 'BTC', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2 }], null)
    state.source = 'mock'
    const view = render(<MemoryRouter><PortfolioSummaryCard /></MemoryRouter>)
    expect(screen.queryByText('240')).toBeNull()
    view.unmount(); localStorage.setItem('investai.portfolio.v1', 'invalid')
    render(<MemoryRouter><PortfolioSummaryCard /></MemoryRouter>)
    expect(within(screen.getByRole('alert')).getByText(/보유 기록을 읽지 못했어요/)).toBeTruthy()
    expect(screen.queryByText('첫 코인 저장하기')).toBeNull()
  })
})
