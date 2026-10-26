import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ModeSwitcher } from '@/components/mode/ModeSwitcher/ModeSwitcher'
import { TradingPage } from '@/pages/Trading/TradingPage'
import { SimpleMarket } from './SimpleMarket'
import type { MarketInstrument } from '@/types/market'

vi.mock('@/hooks/useCompactLayout', () => ({ useCompactLayout: () => true }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: () => ({ candles: [], currentPrice: null, dataQuality: 'unavailable', connectionStatus: 'disconnected', updatedAt: null, isLoading: false }) }))
vi.mock('@/hooks/useDominance', () => ({ useDominance: () => ({ data: null, loading: false, error: true }) }))
beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'en') })
afterEach(() => vi.restoreAllMocks())

it('keeps purchase inputs when switching tasks and modes, and calculates the same outcome', () => {
  renderWithProviders(<><ModeSwitcher /><TradingPage /></>)
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Planned entry' }), { target: { value: '100' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: /2. Price limits/ }))
  expect(screen.queryByRole('spinbutton', { name: 'Quantity' })).toBeNull()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Target reference' }), { target: { value: '120' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Stop reference' }), { target: { value: '90' } })
  expect(screen.getByText('200.1 KRW')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Expert Mode/ }))
  expect((screen.getByRole('spinbutton', { name: 'Quantity' }) as HTMLInputElement).value).toBe('2')
  expect(screen.getByText('200.1 KRW')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Simple Mode/ }))
  fireEvent.click(screen.getByRole('button', { name: /2. Price limits/ }))
  expect((screen.getByRole('spinbutton', { name: 'Stop reference' }) as HTMLInputElement).value).toBe('90')
})

it('makes mobile market selection a list-to-analysis journey without chart terminal controls', () => {
  const coin: MarketInstrument = { id: 'upbit-btc', name: 'Bitcoin', symbol: 'BTC/KRW', marketId: 'upbit', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }
  const onSelect = vi.fn(), onFavorite = vi.fn()
  renderWithProviders(<SimpleMarket catalog={{ venue: 'upbit-krw', source: 'mock', fetchedAt: Date.now(), instruments: [coin] }} loading={false} error={null} venue="upbit-krw" onVenue={vi.fn()} selected={coin} onSelect={onSelect} search="BTC" onSearch={vi.fn()} favorites={new Set()} favoritesOnly={false} onFavoritesOnly={vi.fn()} onFavorite={onFavorite} onRetry={vi.fn()} />)
  const list = screen.getByRole('region', { name: 'Assets' })
  fireEvent.click(within(list).getByRole('button', { name: /BTC\/KRW Bitcoin/ }))
  expect(onSelect).toHaveBeenCalledWith(coin)
  expect(screen.queryByRole('region', { name: 'Assets' })).toBeNull()
  expect(screen.queryByRole('img', { name: /TradingView/ })).toBeNull()
  expect(screen.getByRole('link', { name: /Review my situation/ }).getAttribute('href')).toContain('instrumentId=upbit-btc')
  fireEvent.click(screen.getByRole('button', { name: /Back to assets/ }))
  expect((screen.getByRole('searchbox', { name: 'Asset name' }) as HTMLInputElement).value).toBe('BTC')
  fireEvent.click(screen.getByRole('button', { name: 'BTC/KRW favorite' }))
  expect(onFavorite).toHaveBeenCalledWith('upbit-btc')
})
