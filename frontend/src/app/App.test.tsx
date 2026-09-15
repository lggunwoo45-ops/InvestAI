import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'

describe('InvestAI application shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('opens the market workspace as the home page', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Market Overview' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'AI Copilot' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Global search' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Upbit' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Binance Futures' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Korea Stock' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'US Stock' })).toBeTruthy()
  })

  it('sends a selected symbol to the AI Copilot', async () => {
    render(<App />)

    const samsungRowButton = (await screen.findByText('Samsung Electronics')).closest('button')
    expect(samsungRowButton).toBeTruthy()
    fireEvent.click(samsungRowButton!)

    expect(await screen.findByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Trading information' })).toBeTruthy()
    expect(screen.getByText('Top 10 · MOCK')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Recent Trades' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '4H' }))
    expect(await screen.findByRole('img', { name: /005930 4H TradingView candlestick chart in mock mode/i })).toBeTruthy()

    const copilot = screen.getByRole('complementary', { name: 'AI Copilot' })
    expect(copilot.textContent).toContain('005930')
    expect(copilot.textContent).toContain('4H')
    expect(copilot.textContent).toContain('Current Price')
    expect(copilot.textContent).toContain('AI Confidence')
    expect(copilot.textContent).toContain('Why?')
    expect(copilot.textContent).toContain('Trend continuation')
  })

  it('keeps an explicit mock mode for supported live markets', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'MOCK' }))
    const bitcoinRowButton = (await screen.findByText('Bitcoin')).closest('button')
    fireEvent.click(bitcoinRowButton!)

    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getAllByText('MOCK').length).toBeGreaterThan(1)
  })

  it('filters symbols and toggles favorites inside a market section', async () => {
    render(<App />)

    const upbitSearch = await screen.findByRole('searchbox', { name: 'Search Upbit' })
    fireEvent.change(upbitSearch, { target: { value: 'XRP' } })

    const upbitSection = screen.getByRole('region', { name: 'Upbit' })
    expect(within(upbitSection).queryByText('Bitcoin')).toBeNull()
    expect(within(upbitSection).getByText('XRP')).toBeTruthy()

    const favoriteButton = screen.getByRole('button', { name: 'Add XRP/KRW favorite' })
    fireEvent.click(favoriteButton)
    expect(favoriteButton.getAttribute('aria-pressed')).toBe('true')
  })

  it('provides persisted multi-watchlist dashboard controls', async () => {
    window.history.pushState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Smart Market Dashboard' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Crypto/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Korea/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /US/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Custom/ })).toBeTruthy()
    expect(screen.getByText('Saved locally')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /Custom/ }))
    const symbolSelect = screen.getByRole('combobox', { name: 'Symbol to add' })
    const nvidiaOption = await screen.findByRole('option', { name: /NVDA/ })
    fireEvent.change(symbolSelect, { target: { value: nvidiaOption.getAttribute('value') } })
    fireEvent.click(screen.getByRole('button', { name: 'Add symbol' }))

    expect(screen.getByRole('button', { name: 'Remove NVDA' })).toBeTruthy()
    expect(window.localStorage.getItem('investai.watchlists.v2')).toContain('us-nvda')
  })

  it('searches stocks globally and opens their market context', async () => {
    render(<App />)
    const globalSearch = screen.getByRole('searchbox', { name: 'Global search' })
    fireEvent.change(globalSearch, { target: { value: 'NVDA' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Open NVDA from global search' }))

    expect(await screen.findByRole('img', { name: /NVDA 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
  })

  it('filters the News Center by the active symbol', async () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Global search' }), { target: { value: 'NVDA' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Open NVDA from global search' }))
    fireEvent.click(screen.getByRole('link', { name: 'News' }))

    expect(await screen.findByRole('heading', { name: 'News Center' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'NVDA ON' })).toBeTruthy()
    expect(screen.getByText(/NVIDIA outlines/)).toBeTruthy()
  })

  it('clears the Header market status after leaving Market', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'MOCK' }))
    const bitcoinRowButton = (await screen.findByText('Bitcoin')).closest('button')
    fireEvent.click(bitcoinRowButton!)
    expect(await screen.findByTitle('Market: online')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(await screen.findByTitle('Market: unconfigured')).toBeTruthy()
  })
})
