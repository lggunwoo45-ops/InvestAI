import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useStockSnapshot } from './useStockSnapshot'
import { loadStockSnapshot, type StockSnapshot } from '@/services/stocks/stockData'
vi.mock('@/services/stocks/stockData', async original => ({ ...await original<object>(), loadStockSnapshot: vi.fn() }))
const snapshot = (symbol: string) => ({ provider: 'KIS', market: 'KRX', currency: 'KRW', quote: { symbol, price: 100, changePercent: 1, volume: 1, fetchedAt: Date.now() }, candles: [], historyError: 'unavailable' }) as StockSnapshot
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
it('does not apply a late response from the previous stock', async () => {
  let finish!: (value: StockSnapshot) => void
  vi.mocked(loadStockSnapshot).mockImplementation(symbol => symbol === '005930' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(snapshot(symbol)))
  const hook = renderHook(({ symbol }) => useStockSnapshot(symbol), { initialProps: { symbol: '005930' } })
  hook.rerender({ symbol: '000660' })
  await waitFor(() => expect(hook.result.current.data?.quote.symbol).toBe('000660'))
  await act(async () => finish(snapshot('005930')))
  expect(hook.result.current.data?.quote.symbol).toBe('000660')
})
it('pauses hidden-page requests and removes polling after unmount', async () => {
  vi.useFakeTimers()
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  vi.mocked(loadStockSnapshot).mockClear().mockResolvedValue(snapshot('005930'))
  const hook = renderHook(() => useStockSnapshot('005930'))
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(loadStockSnapshot).not.toHaveBeenCalled()
  visibility.mockReturnValue('visible')
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(loadStockSnapshot).toHaveBeenCalledTimes(1)
  hook.unmount()
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(loadStockSnapshot).toHaveBeenCalledTimes(1)
})
