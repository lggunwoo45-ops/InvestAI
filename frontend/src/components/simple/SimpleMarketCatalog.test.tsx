import { useState } from 'react'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { SimpleMarket } from './SimpleMarket'
import { coreMarketCoins } from './coreMarketCoins'

vi.mock('@/hooks/useCompactLayout', () => ({ useCompactLayout: () => true }))
beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko') })
const coin = (symbol: string, quote = 'KRW'): MarketInstrument => ({ id: `upbit-${quote}-${symbol}`, symbol: `${symbol}/${quote}`, name: symbol, marketId: 'upbit', quoteCurrency: quote, lastPrice: 100, change24hPercent: 1, volume24h: 1000 })
const catalog = ['NEW', 'LINK', 'ADA', 'DOGE', 'SOL', 'XRP', 'ETH', 'BTC', ...Array.from({ length: 20 }, (_, n) => `ALT${n}`)].map(symbol => coin(symbol))

function Catalog({ items = catalog, venue = 'upbit-krw', error = null }: { items?: MarketInstrument[]; venue?: MarketVenue; error?: string | null }) {
  const [search, setSearch] = useState(''), [favoritesOnly, setFavoritesOnly] = useState(false)
  const location = useLocation()
  return <><SimpleMarket catalog={error ? null : { venue, source: 'live', fetchedAt: 1, instruments: items }} venue={venue} loading={false} error={error} onVenue={vi.fn()} selected={null} onSelect={vi.fn()} search={search} onSearch={setSearch} favorites={new Set([catalog[0].id])} favoritesOnly={favoritesOnly} onFavoritesOnly={setFavoritesOnly} onFavorite={vi.fn()} onRetry={vi.fn()} /><output data-testid="query">{location.search}</output></>
}
const assets = () => within(screen.getByRole('region', { name: '종목 목록' }))
const symbols = () => assets().getAllByRole('button').filter(button => !button.getAttribute('aria-label')?.endsWith('관심종목')).map(button => button.querySelector('strong')?.textContent)

it('starts with seven fixed core coins and opens the entire catalog without load-more steps', () => {
  renderWithProviders(<Catalog />)
  expect(symbols()).toEqual(['BTC/KRW', 'ETH/KRW', 'XRP/KRW', 'SOL/KRW', 'DOGE/KRW', 'ADA/KRW', 'LINK/KRW'])
  expect(assets().getByText(/시가총액 순위는 아니며/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: '종목 더 보기' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '전체 코인 보기' }))
  expect(symbols()).toHaveLength(catalog.length)
  expect(symbols()).toContain('ALT19/KRW')
  expect(screen.getByTestId('query').textContent).toContain('coins=all')
  fireEvent.click(screen.getByRole('button', { name: '대표 코인' }))
  expect(symbols()).toHaveLength(7)
})

it('searches the full catalog and Korean coin names, and shows favorites outside the core list', () => {
  renderWithProviders(<Catalog />)
  fireEvent.change(screen.getByRole('searchbox', { name: '종목 이름' }), { target: { value: 'ALT19' } })
  expect(symbols()).toEqual(['ALT19/KRW'])
  fireEvent.change(screen.getByRole('searchbox', { name: '종목 이름' }), { target: { value: '리플' } })
  expect(symbols()).toEqual(['XRP/KRW'])
  fireEvent.click(screen.getByRole('button', { name: '대표 코인' }))
  fireEvent.click(screen.getByRole('button', { name: '관심종목만' }))
  expect(symbols()).toEqual(['NEW/KRW'])
  fireEvent.click(screen.getByRole('button', { name: '전체 코인 보기' }))
  expect(symbols()).toHaveLength(catalog.length)
  expect((screen.getByRole('searchbox', { name: '종목 이름' }) as HTMLInputElement).value).toBe('')
})

it('keeps the original exchange and quote pair and does not invent missing core listings', () => {
  const eth = coin('ETH', 'BTC'), btcUsdc = coin('BTC', 'USDC'), btcUsdt = coin('BTC', 'USDT')
  const selected = coreMarketCoins([eth, btcUsdc, btcUsdt, coin('NEW')])
  expect(selected).toEqual([btcUsdt, eth])
  expect(selected[0]).toBe(btcUsdt)
  renderWithProviders(<Catalog items={[eth]} venue="upbit-btc" />)
  expect(symbols()).toEqual(['ETH/BTC'])
  expect(assets().getByText('대표 코인 1개 · 고정 목록')).toBeTruthy()
})

it('leaves stock listings complete and does not apply the crypto shortlist', () => {
  renderWithProviders(<Catalog venue="nasdaq" items={catalog.map(item => ({ ...item, marketId: 'us-stock' }))} />)
  expect(screen.queryByRole('group', { name: '코인 목록 선택' })).toBeNull()
  expect(symbols()).toHaveLength(catalog.length)
})

