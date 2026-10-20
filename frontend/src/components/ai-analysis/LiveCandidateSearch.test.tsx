import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { marketDataService } from '@/services/market/marketDataService'
import type { MarketInstrument } from '@/types/market'
import { LiveCandidateSearch } from './LiveCandidateSearch'

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), scan: vi.fn(), mode: 'live' }))
vi.mock('@/services/market/providers/upbitRelay', () => ({ upbitRelayBase: () => 'https://relay.test/api/upbit' }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: mocks.mode }) }))
vi.mock('@/services/cryptoAnalysis/liveCandidateScan', async importOriginal => ({ ...await importOriginal<object>(), scanCandidates: mocks.scan }))

const coin: MarketInstrument = { id: 'upbit-btc', symbol: 'BTC/KRW', marketId: 'upbit', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, volume24h: 1000, change24hPercent: 1 }
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(marketDataService, 'getMarketCatalog').mockImplementation(mocks.catalog); mocks.mode = 'live'; window.localStorage.setItem('market-copilot.language', 'en') })

it('starts only on request, displays real result coverage and supports filters and analysis links', async () => {
  mocks.catalog.mockResolvedValue({ source: 'live', fetchedAt: Date.now(), instruments: [coin] })
  mocks.scan.mockImplementation(async (_pool, { onResult }) => onResult({ instrument: coin, analyzedAt: Date.now(), expiresAt: Date.now() + 90000, timedOut: false, decision: { direction: 'buy', coverage: 2, extended: false, plan: null, frames: [] } }, 1, 1))
  renderWithProviders(<LiveCandidateSearch />)
  expect(mocks.catalog).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Scan live data' }))
  expect(await screen.findByRole('link', { name: /Open current analysis/ })).toHaveProperty('pathname', '/my-analysis')
  expect(screen.getByRole('link', { name: /Open current analysis/ }).getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-btc')
  expect(screen.getByText(/Timeframe coverage 2\/3/)).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Direction' }), { target: { value: 'sell' } })
  expect(screen.queryByRole('link', { name: /Open current analysis/ })).toBeNull()
  expect(mocks.catalog).toHaveBeenCalledTimes(1)
})

it('cancels pending work on stop, data mode changes and navigation', async () => {
  let signal: AbortSignal | undefined
  mocks.catalog.mockImplementation((_venue, _mode, _force, abort) => { signal = abort; return new Promise(() => {}) })
  const view = renderWithProviders(<LiveCandidateSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Scan live data' }))
  fireEvent.click(screen.getByRole('button', { name: 'Stop scan' }))
  expect(signal?.aborted).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Scan live data' }))
  await act(async () => { mocks.mode = 'mock'; view.rerender(<LiveCandidateSearch />) })
  expect(signal?.aborted).toBe(true)
  expect(screen.getByRole('button', { name: 'Scan live data' }).hasAttribute('disabled')).toBe(true)
  mocks.mode = 'live'; view.rerender(<LiveCandidateSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Scan live data' }))
  view.unmount()
  expect(signal?.aborted).toBe(true)
})
