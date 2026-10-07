import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'

const MARKET_LIST_COLLAPSED_KEY = 'market-copilot.market-list-collapsed.v1'
const originalMatchMedia = window.matchMedia

function mockNarrowViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 900px)' ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Market instrument-list layout', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/market')
    mockNarrowViewport(false)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network disabled in deterministic layout test'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
  })

  it('keeps search, sort, favorite, and selected-instrument context while collapsing and expanding', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })

    const search = screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' })
    fireEvent.change(search, { target: { value: 'XRP' } })
    fireEvent.click(screen.getByRole('button', { name: /Sort by Price/ }))
    const favorite = await screen.findByRole('button', { name: 'Add XRP/KRW favorite' })
    fireEvent.click(favorite)
    await waitFor(() => expect(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)).toContain('upbit-xrp'))
    expect(await screen.findByRole('button', { name: 'Remove XRP/KRW favorite' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open XRP/KRW' }))

    expect(await screen.findByRole('img', { name: /XRP\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hide instruments' }).textContent).toContain('Hide instruments')
    fireEvent.click(screen.getByRole('button', { name: 'Hide instruments' }))

    expect(screen.getByRole('button', { name: 'Show instruments' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('searchbox', { name: 'Search symbol, Korean or English name' })).toBeNull()
    expect(screen.getByRole('img', { name: /XRP\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'AI Copilot' }).textContent).toContain('XRP/KRW')
    expect(window.localStorage.getItem(MARKET_LIST_COLLAPSED_KEY)).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Show instruments' }))
    expect((screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' }) as HTMLInputElement).value).toBe('XRP')
    expect(screen.getByText('Sorted by').closest('[role="status"]')?.textContent).toContain('Price')
    expect(screen.getByRole('button', { name: 'Remove XRP/KRW favorite' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Open XRP/KRW' }).getAttribute('aria-current')).toBe('true')
    expect(window.localStorage.getItem(MARKET_LIST_COLLAPSED_KEY)).toBe('false')
  })

  it('restores an explicit collapsed preference after remounting', async () => {
    window.localStorage.setItem(MARKET_LIST_COLLAPSED_KEY, 'true')
    const first = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Show instruments' })).toBeTruthy()
    first.unmount()

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Show instruments' })).toBeTruthy()
  })

  it('defaults to a collapsed detail list on narrow screens without removing access to the list', async () => {
    mockNarrowViewport(true)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))

    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show instruments' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hide instruments' }).getAttribute('aria-expanded')).toBe('true'))
    expect(within(screen.getByRole('button', { name: 'Open BTC/KRW' })).getByText('BTC/KRW')).toBeTruthy()
  })

  it('announces the layout control in the active interface language', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Open BTC/KRW' }))
    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ko' } })
    expect(screen.getByRole('button', { name: '종목 숨기기' }).textContent).toContain('종목 숨기기')
    fireEvent.click(screen.getByRole('button', { name: '종목 숨기기' }))
    expect(screen.getByRole('button', { name: '종목 보기' }).textContent).toContain('종목 보기')
    expect(screen.queryByText('차트 넓게 보기')).toBeNull()
  })
})
