import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalSearch } from './GlobalSearch'
import { marketDataService } from '@/services/market/marketDataService'
const mocks = vi.hoisted(() => ({ select: vi.fn(), track: vi.fn() }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: 'live', selectInstrument: mocks.select }) }))
vi.mock('@/hooks/useWatchlists', () => ({ useWatchlists: () => ({ trackRecentlyViewed: mocks.track }) }))
vi.mock('@/hooks/useNewsProviderMode', () => ({ useNewsProviderMode: () => ({ result: null }) }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
const coin = { id: 'upbit-newcoin', marketId: 'upbit' as const, symbol: 'NEWCOIN/KRW', name: 'NEWCOIN', quoteCurrency: 'KRW', lastPrice: 10, change24hPercent: 2, volume24h: 500 }
beforeEach(() => { vi.restoreAllMocks(); mocks.select.mockClear(); mocks.track.mockClear() })
describe('real catalog global search', () => {
  it('loads only after typing and opens the actual returned instrument, including new listings', async () => {
    const load = vi.spyOn(marketDataService, 'getMarketCatalog').mockResolvedValue({ venue: 'upbit-krw', instruments: [coin], source: 'live', fetchedAt: Date.now() })
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>)
    expect(load).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'newcoin' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Open NEWCOIN/KRW from global search' }))
    expect(mocks.select).toHaveBeenCalledWith(coin); expect(mocks.track).toHaveBeenCalledWith(coin.id)
    expect(screen.queryByText('실제 거래소 목록')).toBeNull()
  })
  it('aborts pending work when search closes and ignores a late result', async () => {
    let finish!: (value: unknown) => void
    const load = vi.spyOn(marketDataService, 'getMarketCatalog').mockImplementation(() => new Promise(resolve => { finish = resolve as typeof finish }))
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'NEW' } })
    await waitFor(() => expect(load).toHaveBeenCalled())
    const signal = load.mock.calls[0][3]!
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(signal.aborted).toBe(true)
    finish({ venue: 'upbit-krw', instruments: [coin], source: 'live', fetchedAt: Date.now() })
    expect(screen.queryByRole('button', { name: /NEWCOIN/ })).toBeNull()
  })
  it('shows failure without silently substituting demonstration assets', async () => {
    vi.spyOn(marketDataService, 'getMarketCatalog').mockRejectedValue(new Error('offline'))
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'BTC' } })
    expect((await screen.findByRole('alert')).textContent).toContain('목록을 불러오지 못했어요')
    expect(screen.queryByRole('button', { name: /Open BTC/ })).toBeNull()
  })
})

it('recognizes Korean coin names only among listings actually returned by the exchange', async () => {
  const btc = { ...coin, id: 'upbit-btc', symbol: 'BTC/KRW', name: 'BTC' }
  vi.spyOn(marketDataService, 'getMarketCatalog').mockResolvedValue({ venue: 'upbit-krw', instruments: [btc], source: 'live', fetchedAt: Date.now() })
  render(<MemoryRouter><GlobalSearch /></MemoryRouter>)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '비트코인' } })
  expect(await screen.findByRole('button', { name: 'Open BTC/KRW from global search' })).toBeTruthy()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '이더리움' } })
  expect(await screen.findByText(/이 마켓에서 일치하는 종목이 없어요/)).toBeTruthy()
})
