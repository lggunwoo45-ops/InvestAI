import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'

describe('InvestAI application shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('opens the market workspace as the home page', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Market Explorer' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'AI Copilot' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Global search' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Crypto' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Korea' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'US' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Upbit' })).toBeTruthy()
  })

  it('sends a selected symbol to the AI Copilot', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Korea' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' }), { target: { value: '005930' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Open 005930' }))

    expect(await screen.findByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect((screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' }) as HTMLInputElement).value).toBe('005930')
    expect(screen.getByRole('button', { name: 'Open 005930' })).toBeTruthy()
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
    fireEvent.click(await screen.findByRole('button', { name: 'Open BTC/KRW' }))

    expect(await screen.findByRole('img', { name: /BTC\/KRW 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.getAllByText('MOCK').length).toBeGreaterThan(1)
  })

  it('filters the active venue and toggles favorites', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'MOCK' }))
    const search = screen.getByRole('searchbox', { name: 'Search symbol, Korean or English name' })
    fireEvent.change(search, { target: { value: 'XRP' } })
    expect(await screen.findByRole('button', { name: 'Open XRP/KRW' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Open BTC/KRW' })).toBeNull()

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
    fireEvent.click(await screen.findByRole('button', { name: 'Open BTC/KRW' }))
    expect(await screen.findByTitle('Market: online')).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(await screen.findByTitle('Market: unconfigured')).toBeTruthy()
  })
})
