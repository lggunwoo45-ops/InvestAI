import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { loadUserChartLines } from '@/services/chartOverlays/userChartLineStorage'
import { useUserChartLines } from './useUserChartLines'

describe('useUserChartLines', () => {
  beforeEach(() => localStorage.clear())

  it('persists add, edit, visibility, and delete operations for one instrument', () => {
    const { result } = renderHook(() => useUserChartLines('btc'))
    let id = ''
    act(() => { id = result.current.addLine({ label: 'Review reference', price: 101 })?.id ?? '' })
    expect(result.current.lines).toHaveLength(1)
    expect(loadUserChartLines('btc')[0]?.label).toBe('Review reference')

    act(() => { result.current.updateLine(id, { label: 'Updated reference', price: 102 }) })
    expect(loadUserChartLines('btc')[0]).toMatchObject({ label: 'Updated reference', price: 102 })
    act(() => { result.current.setLineVisible(id, false) })
    expect(loadUserChartLines('btc')[0]?.visible).toBe(false)
    act(() => { result.current.deleteLine(id) })
    expect(loadUserChartLines('btc')).toEqual([])
  })

  it('keeps instrument-specific runtime state isolated when selection changes', () => {
    const { result, rerender } = renderHook(({ instrumentId }) => useUserChartLines(instrumentId), { initialProps: { instrumentId: 'btc' } })
    act(() => { result.current.addLine({ label: 'BTC review', price: 100 }) })
    rerender({ instrumentId: 'eth' })
    expect(result.current.lines).toEqual([])
    act(() => { result.current.addLine({ label: 'ETH review', price: 50 }) })
    rerender({ instrumentId: 'btc' })
    expect(result.current.lines[0]?.label).toBe('BTC review')
    expect(loadUserChartLines('eth')[0]?.label).toBe('ETH review')
  })
})
