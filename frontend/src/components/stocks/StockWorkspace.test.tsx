import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { StockWorkspace } from './StockWorkspace'
import { StockHoldings } from './StockHoldings'
import { StockDataError, type StockSnapshot } from '@/services/stocks/stockData'
import { domesticStocks } from '@/services/stocks/stockDirectory'
import { readStockHoldings, writeStockHoldings } from '@/services/stocks/stockHoldings'

const state = vi.hoisted(() => ({ data: null as StockSnapshot | null, error: null as StockDataError | null, loading: false, checkedAt: Date.parse('2026-10-22T03:00:00Z') }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'en' }) }))
vi.mock('@/hooks/useStockSnapshot', () => ({ useStockSnapshot: () => ({ ...state, refresh: vi.fn() }) }))
const instrument = domesticStocks.find(row => row.symbol === '005930')!
const show = (positionId?: string) => render(<MemoryRouter><StockWorkspace key={positionId} instrument={instrument} positionId={positionId} /></MemoryRouter>)
beforeEach(() => {
  localStorage.clear(); state.data = null; state.error = null; state.loading = false
})
it('explains missing setup, allows holding records, and never invents returns or analysis', () => {
  state.error = new StockDataError('stock_setup_required')
  localStorage.setItem('investai.portfolio.v1', 'keep-coins')
  show()
  expect(screen.getByText(/Stock data setup is required/)).toBeTruthy()
  expect(screen.queryByText('Unrealized P/L')).toBeNull()
  fireEvent.change(screen.getByLabelText('Average price (KRW)'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Quantity (shares)'), { target: { value: '2' } })
  fireEvent.click(screen.getByText('Save to My Stocks'))
  expect(readStockHoldings().holdings[0]).toMatchObject({ symbol: '005930', average: 100, quantity: 2 })
  expect(screen.getByText('Saved to My Stocks.')).toBeTruthy()
  expect(localStorage.getItem('investai.portfolio.v1')).toBe('keep-coins')
})
it('applies the exact saved lot, displays returns and suspends them after a refresh failure', () => {
  writeStockHoldings([{ id: 'lot-1', symbol: '005930', name: 'Samsung', venue: 'kospi', average: 100, quantity: 2 }], null)
  state.data = { provider: 'KIS', market: 'KRX', currency: 'KRW', quote: { symbol: '005930', price: 120, changePercent: 1.5, volume: 1000, fetchedAt: state.checkedAt }, historyError: null, candles: Array.from({ length: 20 }, (_, i) => ({ timestamp: Date.parse('2026-10-02T00:00:00Z') + i * 86_400_000, open: 100, high: 120, low: 90, close: 100 + i, volume: 100 })) }
  const view = show('lot-1')
  expect((screen.getByLabelText('Quantity (shares)') as HTMLInputElement).value).toBe('2')
  expect(screen.getByText('₩40 (20.00%)')).toBeTruthy()
  expect(screen.getByText('Last completed close: above average')).toBeTruthy()
  expect(screen.getByRole('img', { name: /Daily closes/ })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Quantity (shares)'), { target: { value: '3' } })
  fireEvent.click(screen.getByText('Update holding'))
  expect(readStockHoldings().holdings[0].quantity).toBe(3)
  state.error = new StockDataError('provider_unavailable')
  view.rerender(<MemoryRouter><StockWorkspace key="lot-1" instrument={instrument} positionId="lot-1" /></MemoryRouter>)
  expect(screen.getByText('Previous price')).toBeTruthy()
  expect(screen.queryByText('Unrealized P/L')).toBeNull()
  expect(screen.queryByText('Last completed close: above average')).toBeNull()
})
it('keeps multiple holdings separate and requires confirmation to delete one', () => {
  writeStockHoldings([{ id: 'lot-1', symbol: '005930', name: 'Samsung', venue: 'kospi', average: 100, quantity: 2 }, { id: 'lot-2', symbol: '000660', name: 'SK hynix', venue: 'kospi', average: 200, quantity: 1 }], null)
  render(<MemoryRouter><StockHoldings /></MemoryRouter>)
  const card = screen.getByRole('article', { name: 'Samsung holding' })
  expect(within(card).getByRole('link', { name: /Analyze/ }).getAttribute('href')).toContain('stockPositionId=lot-1')
  fireEvent.click(within(card).getByText('Delete'))
  expect(readStockHoldings().holdings).toHaveLength(2)
  fireEvent.click(within(card).getByText('Confirm delete'))
  expect(readStockHoldings().holdings.map(row => row.id)).toEqual(['lot-2'])
})
it('blocks a deleted or unrelated lot from being silently recreated', () => {
  show('deleted-id')
  fireEvent.change(screen.getByLabelText('Average price (KRW)'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Quantity (shares)'), { target: { value: '2' } })
  fireEvent.click(screen.getByText('Update holding'))
  expect(readStockHoldings().holdings).toEqual([])
})
