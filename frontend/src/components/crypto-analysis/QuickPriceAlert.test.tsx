import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QuickPriceAlert } from './QuickPriceAlert'
import { opportunityCoin } from '@/test/opportunityFixtures'

const state = vi.hoisted(() => ({ user: { id: 'a' } as { id: string } | null, save: vi.fn(), request: vi.fn(), generation: 1 }))
vi.mock('@/services/cloud/useCloud', () => ({ useCloud: () => ({ user: state.user, telegramAvailable: false }) }))
vi.mock('@/services/cloud/cloudClient', () => ({ cloudRequest: (...args: unknown[]) => state.request(...args), cloudSessionGeneration: () => state.generation }))
vi.mock('@/services/cloud/priceAlerts', async original => ({ ...await original<typeof import('@/services/cloud/priceAlerts')>(), savePriceAlert: (...args: unknown[]) => state.save(...args) }))
beforeEach(() => { state.user = { id: 'a' }; state.generation = 1; state.request.mockResolvedValue({ connected: false }); state.save.mockReset().mockResolvedValue({ rules: [] }) })
const props = { instrument: opportunityCoin, threshold: 99, direction: 'below' as const, language: 'en' as const, valid: true }
it('saves the exact original spot pair and edited threshold once, with a route to that asset', async () => {
  render(<MemoryRouter><QuickPriceAlert {...props} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Alert me at this price' }))
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '95.25' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save price alert' }))
  await waitFor(() => expect(screen.getByText('Price alert saved on the server.')).toBeTruthy())
  expect(state.save).toHaveBeenCalledWith({ instrument: { venue: 'upbit', asset: 'SOL', quote: 'KRW', symbol: 'KRW-SOL' }, above: null, below: 95.25, notify: false, requestId: expect.any(String) })
  expect(screen.getByRole('link', { name: /Open my alerts/ }).getAttribute('href')).toContain('instrumentId=upbit-sol')
})
it('reuses the request id after an ambiguous failure and keeps the draft', async () => {
  state.save.mockRejectedValueOnce(new Error('Connection interrupted'))
  render(<MemoryRouter><QuickPriceAlert {...props} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Alert me at this price' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save price alert' }))
  await screen.findByRole('alert')
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('99')
  fireEvent.click(screen.getByRole('button', { name: 'Save price alert' }))
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(2))
  expect(state.save.mock.calls[0][0].requestId).toBe(state.save.mock.calls[1][0].requestId)
})
it('does not claim background alerts for guests or accept invalidated analysis', () => {
  state.user = null
  const view = render(<MemoryRouter><QuickPriceAlert {...props} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Alert me at this price' }))
  expect(screen.getByRole('link', { name: /Sign in to save/ })).toBeTruthy()
  expect(state.save).not.toHaveBeenCalled()
  state.user = { id: 'a' }
  view.rerender(<MemoryRouter><QuickPriceAlert {...props} valid={false} /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Alert me at this price' }).hasAttribute('disabled')).toBe(true)
})
