import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { AiAnalysisPage } from './AiAnalysisPage'

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-one', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-invalid', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: 'INVALID', name: 'Invalid fixture', lastPrice: 0, change24hPercent: 0, volume24h: 0, quoteCurrency: 'KRW' },
]
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: { venue, instruments: instruments.filter((item) => item.marketType === venue), source: 'mock', fetchedAt: 1700000000000 }, loading: false, error: null }) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: () => ({ candles: [], currentPrice: null, dataQuality: 'mock', isLoading: false }) }))
describe('AI Analysis evidence recommendations', () => {
  beforeEach(() => { window.localStorage.clear(); window.localStorage.setItem('market-copilot.language', 'en') })
  it('updates useful recommendations and exclusions when the bucket changes', () => {
    renderWithProviders(<AiAnalysisPage />)
    const panel = () => screen.getByRole('region', { name: 'AI candidates' })
    expect(within(panel()).getByRole('button', { name: 'Select evidence candidate BTC/KRW' })).toBeTruthy()
    expect(panel().textContent).toContain('Keep watching')
    expect(panel().textContent).toContain('Next check')
    fireEvent.click(screen.getByRole('tab', { name: 'KOSPI' }))
    expect(within(panel()).queryByRole('button', { name: 'Select evidence candidate BTC/KRW' })).toBeNull()
    expect(within(panel()).getByRole('button', { name: 'Select evidence candidate 005930' })).toBeTruthy()
    expect(within(panel()).queryByRole('button', { name: 'Select evidence candidate INVALID' })).toBeNull()
    expect(panel().textContent).toContain('Invalid price')
  })
})
