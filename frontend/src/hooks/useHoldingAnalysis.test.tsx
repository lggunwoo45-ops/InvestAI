import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Position } from '@/services/portfolio/portfolioStorage'
import { analyzeHoldings } from '@/services/portfolio/holdingAnalysis'
import { useHoldingAnalysis } from './useHoldingAnalysis'

vi.mock('@/services/portfolio/holdingAnalysis', () => ({ analyzeHoldings: vi.fn() }))
const position: Position = { id: 'one', exchange: 'upbit', venue: 'upbit-krw', instrumentId: 'upbit-btc', symbol: 'BTC', quoteCurrency: 'KRW', averagePrice: 100, quantity: 2 }
describe('holding analysis lifecycle', () => {
  it('does not auto-scan, aborts on edits, ignores a late result, and disables scanning in mock mode', async () => {
    let options!: Parameters<typeof analyzeHoldings>[1]
    let finish!: () => void
    vi.mocked(analyzeHoldings).mockImplementation(async (_, input) => { options = input; await new Promise<void>(resolve => { finish = resolve }) })
    const view = renderHook(({ quantity, live }) => useHoldingAnalysis([{ ...position, quantity }], live), { initialProps: { quantity: 2, live: true } })
    expect(analyzeHoldings).not.toHaveBeenCalled()
    let task!: Promise<void>
    act(() => { task = view.result.current.start() })
    expect(view.result.current.status).toBe('running')
    view.rerender({ quantity: 3, live: true })
    expect(options.signal.aborted).toBe(true)
    await act(async () => { options.onResult({ positionId: 'one', result: null, issue: 'catalog' }); finish(); await task })
    expect(view.result.current.reviews).toEqual({})
    expect(view.result.current.status).toBe('idle')
    view.rerender({ quantity: 3, live: false })
    await act(async () => { await view.result.current.start() })
    expect(analyzeHoldings).toHaveBeenCalledTimes(1)
    view.rerender({ quantity: 3, live: true })
    act(() => { task = view.result.current.start() })
    view.unmount()
    expect(options.signal.aborted).toBe(true)
    finish(); await task
  })
})
