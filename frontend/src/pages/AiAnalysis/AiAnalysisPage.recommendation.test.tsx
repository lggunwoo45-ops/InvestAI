import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketDataMode, MarketInstrument, MarketVenue } from '@/types/market'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { AiAnalysisPage } from './AiAnalysisPage'

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-one', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-invalid', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: 'INVALID', name: 'Invalid fixture', lastPrice: 0, change24hPercent: 0, volume24h: 0, quoteCurrency: 'KRW' },
]
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: vi.fn((venue: MarketVenue, _mode: MarketDataMode, _retry: number, enabled = true) => ({ catalog: enabled ? { venue, instruments: instruments.filter((item) => item.marketType === venue), source: 'mock', fetchedAt: 1700000000000 } : null, loading: false, error: null })) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: () => ({ candles: [], currentPrice: null, dataQuality: 'mock', isLoading: false }) }))
describe('AI Analysis evidence recommendations', () => {
  beforeEach(() => { vi.clearAllMocks(); window.localStorage.clear(); window.localStorage.setItem('market-copilot.displayMode.v1', 'expert'); window.localStorage.setItem('market-copilot.language', 'en') })
  it('updates useful recommendations and exclusions when the bucket changes', () => {
    renderWithProviders(<AiAnalysisPage />)
    expect(vi.mocked(useMarketCatalog)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Daily candidate records' }))
    expect(vi.mocked(useMarketCatalog).mock.calls.filter(call => call[3]).map(call => call[0])).toEqual(expect.arrayContaining(['upbit-krw', 'upbit-btc', 'upbit-usdt']))
    expect(vi.mocked(useMarketCatalog).mock.calls.filter(call => call[3]).every(call => call[0].startsWith('upbit-'))).toBe(true)
    expect(screen.getByText('Explore more with current data').closest('details')?.open).toBe(false)
    fireEvent.click(screen.getByText('Explore more with current data'))
    const panel = () => screen.getByRole('region', { name: 'AI candidates' })
    expect(within(panel()).getByRole('button', { name: 'Select evidence candidate BTC/KRW' })).toBeTruthy()
    expect(panel().textContent).toContain('Keep watching')
    expect(panel().textContent).toContain('Next check')
    vi.mocked(useMarketCatalog).mockClear()
    fireEvent.click(screen.getByRole('tab', { name: 'KOSPI' }))
    expect(vi.mocked(useMarketCatalog).mock.calls.filter(call => call[3]).every(call => call[0] === 'kospi')).toBe(true)
    expect(within(panel()).queryByRole('button', { name: 'Select evidence candidate BTC/KRW' })).toBeNull()
    expect(within(panel()).getByRole('button', { name: 'Select evidence candidate 005930' })).toBeTruthy()
    expect(within(panel()).queryByRole('button', { name: 'Select evidence candidate INVALID' })).toBeNull()
    expect(panel().textContent).toContain('Invalid price')
  })
})
