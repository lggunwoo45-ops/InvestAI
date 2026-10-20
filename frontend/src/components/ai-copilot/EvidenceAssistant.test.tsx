import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { MarketInstrument } from '@/types/market'
import { EvidenceAssistant } from './EvidenceAssistant'
const mocks = vi.hoisted(() => ({ inspect: vi.fn() }))
vi.mock('@/services/cryptoAnalysis/liveCandidateScan', () => ({ inspectInstrument: mocks.inspect }))
const coin: MarketInstrument = { id: 'upbit-btc', symbol: 'BTC/KRW', marketId: 'upbit', quoteCurrency: 'KRW', name: 'Bitcoin', lastPrice: 100, volume24h: 1, change24hPercent: 1 }
beforeEach(() => { vi.clearAllMocks(); window.localStorage.setItem('market-copilot.language', 'en') })
it('makes no request until a supported market question; unknown questions and news do not start market streams', async () => {
  renderWithProviders(<EvidenceAssistant instrument={coin} live />)
  expect(mocks.inspect).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tell me a joke' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
  expect(await screen.findByText(/Choose direction, price zones/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Related news' }))
  expect(await screen.findByText(/No current real headline/)).toBeTruthy()
  expect(mocks.inspect).not.toHaveBeenCalled()
})
it('cancels an in-flight answer and clears prior context when the asset changes', async () => {
  let signal: AbortSignal | undefined, finish: ((value: null) => void) | undefined
  mocks.inspect.mockImplementation((_coin, current) => { signal = current; return new Promise(resolve => { finish = resolve }) })
  const view = renderWithProviders(<EvidenceAssistant instrument={coin} live />)
  fireEvent.click(screen.getByRole('button', { name: 'Trend summary' }))
  view.rerender(<EvidenceAssistant instrument={{ ...coin, id: 'upbit-eth', symbol: 'ETH/KRW' }} live />)
  expect(signal?.aborted).toBe(true)
  await act(async () => finish?.(null))
  expect(screen.getByRole('log').textContent).toBe('')
})
