import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { PriceAlertCenter } from './PriceAlertCenter'
import type { PriceAlert } from '@/services/cloud/priceAlerts'

const state = vi.hoisted(() => ({ user: { id: 'member-a' }, read: vi.fn(), stop: vi.fn(), notification: vi.fn(), connected: false }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'en' }) }))
vi.mock('@/services/cloud/useCloud', () => ({ useCloud: () => ({ user: state.user }) }))
vi.mock('@/services/cloud/cloudClient', () => ({ cloudRequest: () => Promise.resolve({ connected: state.connected }) }))
vi.mock('@/services/cloud/priceAlerts', async original => ({ ...await original<typeof import('@/services/cloud/priceAlerts')>(), readPriceAlerts: () => state.read(), stopPriceAlert: (id: string) => state.stop(id), setPriceAlertNotification: (...args: unknown[]) => state.notification(...args) }))
const spot: PriceAlert = { id: 'spot', asset: 'BTC', instrument: { venue: 'upbit', asset: 'BTC', quote: 'KRW', symbol: 'KRW-BTC' }, above: 90_000_000, below: null, active: true, notify: false, createdAt: Date.now(), checkedAt: Date.now(), issue: null, events: [{ id: 'crossing', at: Date.now(), sourceAt: Date.now(), price: 90_000_001, threshold: 90_000_000, kind: 'above', delivery: 'off' }] }
const futures: PriceAlert = { ...spot, id: 'futures', instrument: { venue: 'binance-futures', asset: 'BTC', quote: 'USDT', symbol: 'BTCUSDT' }, above: 100_000 }
beforeEach(() => { state.user = { id: 'member-a' }; state.connected = false; state.read.mockReset().mockResolvedValue({ rules: [spot, futures] }); state.stop.mockReset(); state.notification.mockReset() })
const panel = () => <MemoryRouter><PriceAlertCenter instrumentId="upbit-btc" /></MemoryRouter>

it('keeps exchange and quote identity, and preserves observations after ending an alert', async () => {
  state.stop.mockResolvedValue({ rules: [{ ...spot, active: false }, futures] })
  render(panel())
  await screen.findByRole('heading', { name: 'BTC/KRW' })
  expect(screen.queryByRole('heading', { name: 'BTC/USDT' })).toBeNull()
  expect(screen.getByRole('link', { name: /Reanalyse this asset/ }).getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-btc')
  expect(screen.getByRole('button', { name: 'Enable phone delivery' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'End alert' }))
  await screen.findByRole('heading', { name: 'No price alerts to show' })
  expect(state.stop).toHaveBeenCalledWith('spot')
  fireEvent.click(screen.getByRole('button', { name: 'Include ended alerts' }))
  expect(screen.getByText('Ended')).toBeTruthy()
  expect(screen.getByText('1 crossing observations')).toBeTruthy()
})

it('discards an old account response after switching members', async () => {
  let finishOld!: (data: { rules: PriceAlert[] }) => void
  state.read.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve })).mockResolvedValue({ rules: [] })
  const view = render(panel())
  await waitFor(() => expect(state.read).toHaveBeenCalledTimes(1))
  state.user = { id: 'member-b' }; view.rerender(panel())
  await screen.findByRole('heading', { name: 'No price alerts to show' })
  await act(async () => finishOld({ rules: [spot] }))
  expect(screen.queryByRole('heading', { name: 'BTC/KRW' })).toBeNull()
})
