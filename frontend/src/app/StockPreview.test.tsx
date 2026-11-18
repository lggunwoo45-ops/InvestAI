import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/app/productScope', async original => {
  const mod = await original<typeof import('./productScope')>()
  const scope = mod.createProductScope('stocks')
  return { ...mod, productScope: scope, isUnavailableProductRequest: (search: string) => mod.isUnavailableProductRequest(search, scope) }
})
import { App } from './App'

describe('separately launched stock preview', () => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem('market-copilot.displayMode.v1', 'expert')
    window.history.pushState({}, '', '/market')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Offline preview test'))
  })
  afterEach(() => vi.restoreAllMocks())
  it('reuses the Korean chart, keeps the mock label and supports collapse and US selection', async () => {
    render(<App />)
    expect(await screen.findByText('Development preview · live stock quotes not connected')).toBeTruthy()
    expect(await screen.findByRole('img', { name: /005930 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Crypto' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hide instruments' }))
    expect(screen.getByRole('button', { name: 'Show instruments' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'US Stocks' }))
    expect(await screen.findByRole('img', { name: /AAPL 1H TradingView candlestick chart in mock mode/i })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Holdings' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: /Analyze instrument/i }))
    expect(await screen.findByText('Opened from Market workspace.')).toBeTruthy()
    expect(window.location.search).toContain('instrumentId=us-aapl')
  })
  it('offers only stock venues in the simple preview', async () => {
    localStorage.setItem('market-copilot.displayMode.v1', 'simple')
    render(<App />)
    const venues = await screen.findByRole('combobox', { name: 'Market' })
    expect([...venues.querySelectorAll('option')].map(o => o.value)).toEqual(['kospi', 'kosdaq', 'nasdaq', 'nyse'])
  })
})
