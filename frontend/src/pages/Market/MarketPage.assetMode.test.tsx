import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import { LAST_MARKET_INSTRUMENT_STORAGE_KEY, MARKET_ASSET_MODE_STORAGE_KEY } from './marketAssetMode'

describe('public crypto product', () => {
  beforeEach(() => {
    window.localStorage.clear(); window.localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    window.history.pushState({}, '', '/market')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network disabled in deterministic Market tests'))
  })
  afterEach(() => vi.restoreAllMocks())
  it('selects BTC/KRW and exposes only crypto in expert mode', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Crypto' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('tab', { name: 'Korea Stocks' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'US Stocks' })).toBeNull()
  })
  it('does not resurrect the old stock workspace or remove its saved instrument', async () => {
    window.localStorage.setItem(MARKET_ASSET_MODE_STORAGE_KEY, 'korea')
    window.localStorage.setItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, instrumentIds: { korea: 'krx-000660' } }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(window.localStorage.getItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY)).toContain('krx-000660')
  })
  it('has no stock venue in simple mode', async () => {
    window.localStorage.setItem('market-copilot.displayMode.v1', 'simple')
    render(<App />)
    const venues = await screen.findByRole('combobox', { name: 'Market' })
    expect([...venues.querySelectorAll('option')].map(o => o.value)).toEqual(['upbit-krw', 'upbit-btc', 'upbit-usdt', 'binance-spot', 'binance-futures'])
  })
  it.each(['/my-analysis?instrumentId=krx-005930', '/market?venue=nasdaq', '/my-analysis?instrumentId=us-aapl&product=stocks-preview'])('blocks direct stock entry: %s', async path => {
    window.history.pushState({}, '', path)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'This market is not available here' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Market Explorer' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Open market' }))
    expect(await screen.findByRole('region', { name: 'Market Explorer' })).toBeTruthy()
  })
})
