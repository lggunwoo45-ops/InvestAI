import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketDataMode, MarketInstrument, MarketVenue } from '@/types/market'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { AiAnalysisPage } from './AiAnalysisPage'

vi.mock('@/app/productScope', async original => {
  const mod = await original<typeof import('@/app/productScope')>()
  return { ...mod, productScope: mod.createProductScope('stocks') }
})

const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-one', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' },
  { id: 'krx-invalid', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: 'INVALID', name: 'Invalid fixture', lastPrice: 0, change24hPercent: 0, volume24h: 0, quoteCurrency: 'KRW' },
]
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: vi.fn((venue: MarketVenue, _mode: MarketDataMode, _retry: number, enabled = true) => ({ catalog: enabled ? { venue, instruments: instruments.filter((item) => item.marketType === venue), source: 'mock', fetchedAt: 1700000000000 } : null, loading: false, error: null })) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: () => ({ candles: [], currentPrice: null, dataQuality: 'mock', isLoading: false }) }))
describe('AI Analysis evidence recommendations', () => {
  beforeEach(() => { vi.clearAllMocks(); window.localStorage.clear(); window.localStorage.setItem('market-copilot.displayMode.v1', 'expert'); window.localStorage.setItem('market-copilot.language', 'en') })
  it('keeps mock stock candidates and invalid-price exclusions in the separate stock product', () => {
    renderWithProviders(<AiAnalysisPage />)
    expect(vi.mocked(useMarketCatalog).mock.calls.filter(call => call[3]).every(call => call[0] === 'kospi')).toBe(true)
    fireEvent.click(screen.getByText('Explore more with current data'))
    const panel = () => screen.getByRole('region', { name: 'AI candidates' })
    expect(within(panel()).getByRole('button', { name: 'Select evidence candidate 005930' })).toBeTruthy()
    expect(within(panel()).queryByRole('button', { name: 'Select evidence candidate INVALID' })).toBeNull()
    expect(panel().textContent).toContain('Invalid price')
  })
})
