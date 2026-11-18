import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'
vi.mock('@/app/productScope', async original => {
  const mod = await original<typeof import('@/app/productScope')>()
  const scope = mod.createProductScope('stocks')
  return { ...mod, productScope: scope, isUnavailableProductRequest: (search: string) => mod.isUnavailableProductRequest(search, scope) }
})
vi.mock('@/hooks/useMajorSupportHistory', () => ({ useMajorSupportHistory: () => ({data:null,loading:false,failed:false,retry:vi.fn()}) }))
const catalogMockState = vi.hoisted(() => ({ failedVenue: null as string | null }))
const technicalMockState = vi.hoisted(() => ({ isLoading: false }))
const instruments: MarketInstrument[] = [
  { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', koreanName: '비트코인', englishName: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 1000 },
  { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung Electronics', koreanName: '삼성전자', englishName: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70000, change24hPercent: 1, volume24h: 5000 },
  { id: 'us-aapl', marketId: 'us-stock', marketType: 'nasdaq', providerType: 'mock-us', symbol: 'AAPL', name: 'Apple', englishName: 'Apple', quoteCurrency: 'USD', lastPrice: 230, change24hPercent: -1, volume24h: 6000 },
  { id: 'binance-spot-btcusdt', marketId: 'binance-spot', marketType: 'binance-spot', providerType: 'binance-spot', symbol: 'BTCUSDT', name: 'Bitcoin / Tether', englishName: 'Bitcoin / Tether', quoteCurrency: 'USDT', lastPrice: 95000, change24hPercent: -9, volume24h: 9000 },
]
vi.mock('@/hooks/useMarketCatalog', () => ({ useMarketCatalog: (venue: MarketVenue) => ({ catalog: catalogMockState.failedVenue === venue ? null : { venue, source: venue === 'upbit-krw' ? 'live' : 'mock', fetchedAt: 0, instruments: instruments.filter((item) => item.marketType === venue) }, loading: false, error: catalogMockState.failedVenue === venue ? 'Catalog failed' : null, loadingMilliseconds: 0 }) }))
vi.mock('@/hooks/useDartDisclosures', () => ({ useDartDisclosures: (stockCode: string | null) => stockCode ? { status: 'mapping_unavailable', sourceMode: 'disabled', message: 'Mapping unavailable.', disclosures: [], fetchedAt: null } : { status: 'unavailable', sourceMode: 'disabled', message: 'Korean stocks only.', disclosures: [], fetchedAt: null } }))
vi.mock('@/hooks/useDominance', () => ({ useDominance: () => ({ data: null, loading: false, error: true }) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({
  useTechnicalLevelData: (instrument: MarketInstrument | null) => ({
    candles: instrument ? Array.from({ length: 60 }, (_, index) => {
      const close = instrument.lastPrice * (0.96 + Math.sin(index / 3) * 0.02)
      return { timestamp: 1_700_000_000_000 + index * 86_400_000, open: close * 0.998, high: close * 1.03, low: close * 0.97, close, volume: 100 + index }
    }) : [],
    currentPrice: instrument?.lastPrice ?? null,
    dataQuality: instrument ? instrument.providerType?.startsWith('mock') ? 'mock' : 'live' : 'unavailable',
    connectionStatus: instrument ? instrument.providerType?.startsWith('mock') ? 'mock' : 'live' : 'idle',
    isLoading: technicalMockState.isLoading,
  }),
}))

describe('stock preview analysis', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
  it('offers a focused stock summary and preserves personal inputs in the full expert analysis', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'Instrument Analysis' })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search instrument' }), { target: { value: 'Samsung' } })
    fireEvent.click(screen.getByRole('button', { name: /005930/ }))
    expect(screen.getByRole('heading', { name: '005930' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Rule basis' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Chart structure analysis' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'My holding' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'My note (optional)' }), { target: { value: 'Personal review note' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Average price (optional)' }), { target: { value: '68000' } })
    expect(screen.getByRole('region', { name: 'Position review' }).textContent).toContain('68,000 KRW')
    fireEvent.click(screen.getByRole('button', { name: /Expert Mode/ }))
    expect(screen.getByRole('region', { name: 'Review summary' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Rule basis' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Chart structure analysis' }).getAttribute('data-display-mode')).toBe('expert')
    expect(screen.getByRole('region', { name: 'Chart overlays' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Your inputs' }).textContent).toContain('Personal review note')
    fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
    fireEvent.click(screen.getByRole('button', { name: 'My holding' }))
    expect((screen.getByRole('spinbutton', { name: 'Average price (optional)' }) as HTMLInputElement).value).toBe('68000')
  })
  it('does not show disclosure review for a US stock', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=us-aapl']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'AAPL' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Disclosure review' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recent DART disclosures' })).toBeNull()
  })
  it('keeps stock targets unavailable when only mock candles are available', async () => {
    render(<AppProviders><MemoryRouter initialEntries={['/my-analysis?instrumentId=us-aapl']}><AppRoutes /></MemoryRouter></AppProviders>)
    expect(await screen.findByRole('heading', { name: 'AAPL' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'How far could it fall?' }))
    const stock = screen.getByRole('region', { name: 'How far could it fall?' })
    expect(stock.textContent).toContain('USD')
    expect(within(stock).getByText('Price levels are not available yet')).toBeTruthy()
  })

})
