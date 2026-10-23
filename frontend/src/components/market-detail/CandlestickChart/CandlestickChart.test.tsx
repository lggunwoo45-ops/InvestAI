import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import { USER_CHART_LINE_STORAGE_KEY } from '@/services/chartOverlays/userChartLineStorage'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { CandlestickChart } from './CandlestickChart'

const chartMock = vi.hoisted(() => {
  const createPriceLine = vi.fn((options: unknown) => ({ options, applyOptions: vi.fn() }))
  const removePriceLine = vi.fn()
  const candleSeries = { setData: vi.fn(), update: vi.fn(), createPriceLine, removePriceLine, priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) }
  const volumeSeries = { setData: vi.fn(), update: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) }
  const fitContent = vi.fn()
  const createChart = vi.fn(() => {
    let seriesIndex = 0
    return {
      addSeries: vi.fn(() => seriesIndex++ === 0 ? candleSeries : volumeSeries),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({ fitContent })),
      remove: vi.fn(),
    }
  })
  return { createChart, createPriceLine, removePriceLine, candleSeries, volumeSeries, fitContent }
})

vi.mock('lightweight-charts', () => ({
  CandlestickSeries: 'CandlestickSeries',
  HistogramSeries: 'HistogramSeries',
  ColorType: { Solid: 'solid' },
  LineStyle: { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3 },
  createChart: chartMock.createChart,
}))

class ResizeObserverMock {
  observe() { /* The chart only needs an observable container in this deterministic test. */ }
  disconnect() { /* Nothing to release in the test double. */ }
}

const instrument: MarketInstrument = {
  id: 'upbit-btc', marketId: 'upbit', providerType: 'upbit', marketType: 'upbit-krw', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1_000,
}
const candles: readonly Candle[] = Array.from({ length: 60 }, (_, index) => {
  const offset = Math.sin(index / 2) * 5
  return { timestamp: Date.UTC(2026, 0, index + 1), open: 99 + offset, high: 108 + offset, low: 92 + offset, close: 100 + offset, volume: 1_000 + index }
})
const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument, candles, language: 'en', dataQuality: 'mock' })

describe('CandlestickChart chart overlays', () => {
  it('fits the first history and new timeframe but keeps the viewport through appended and rolling bars', () => {
    chartMock.fitContent.mockClear()
    const props = { instrument, timeframe: '1H' as const, mode: 'live' as const, technicalAnalysis }
    const { rerender } = render(<LanguageProvider><CandlestickChart {...props} candles={[]} /></LanguageProvider>)
    expect(chartMock.fitContent).not.toHaveBeenCalled()
    rerender(<LanguageProvider><CandlestickChart {...props} candles={candles} /></LanguageProvider>)
    expect(chartMock.fitContent).toHaveBeenCalledOnce()
    chartMock.candleSeries.setData.mockClear()
    chartMock.candleSeries.update.mockClear()
    const next = { ...candles.at(-1)!, timestamp: candles.at(-1)!.timestamp + 3_600_000 }
    const appended = [...candles, next]
    rerender(<LanguageProvider><CandlestickChart {...props} candles={appended} /></LanguageProvider>)
    expect(chartMock.candleSeries.update).toHaveBeenCalledOnce()
    expect(chartMock.candleSeries.setData).not.toHaveBeenCalled()
    const rolling = [...appended.slice(1), { ...next, timestamp: next.timestamp + 3_600_000 }]
    rerender(<LanguageProvider><CandlestickChart {...props} candles={rolling} /></LanguageProvider>)
    expect(chartMock.candleSeries.setData).toHaveBeenCalledOnce()
    expect(chartMock.candleSeries.setData.mock.lastCall?.[0]).toHaveLength(rolling.length)
    expect(chartMock.fitContent).toHaveBeenCalledOnce()
    rerender(<LanguageProvider><CandlestickChart {...props} candles={candles} timeframe="4H" /></LanguageProvider>)
    expect(chartMock.fitContent).toHaveBeenCalledTimes(2)
  })
  it('updates a live candle without reading styles for every history bar or resetting the viewport', () => {
    const { rerender } = render(<LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    chartMock.candleSeries.setData.mockClear()
    chartMock.candleSeries.update.mockClear()
    chartMock.fitContent.mockClear()
    const styles = vi.spyOn(window, 'getComputedStyle')
    try {
      const tick = [...candles.slice(0, -1), { ...candles.at(-1)!, close: 101, volume: 1500 }]
      rerender(<LanguageProvider><CandlestickChart candles={tick} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
      expect(styles.mock.calls.length).toBeLessThanOrEqual(2)
      expect(chartMock.candleSeries.setData).not.toHaveBeenCalled()
      expect(chartMock.candleSeries.update).toHaveBeenLastCalledWith(expect.objectContaining({ close: 101 }))
      expect(chartMock.volumeSeries.update).toHaveBeenLastCalledWith(expect.objectContaining({ value: 1500 }))
      expect(chartMock.fitContent).not.toHaveBeenCalled()
      // A REST correction still replaces old bars, while preserving the user's zoom.
      const corrected = tick.map((candle, index) => index === 0 ? { ...candle, close: 102 } : candle)
      rerender(<LanguageProvider><CandlestickChart candles={corrected} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
      expect(chartMock.candleSeries.setData.mock.lastCall?.[0][0].close).toBe(102)
      expect(chartMock.fitContent).not.toHaveBeenCalled()
    } finally { styles.mockRestore() }
  })
  it('replaces all cached bars when refreshed history corrects an older candle', () => {
    chartMock.candleSeries.setData.mockClear()
    chartMock.candleSeries.update.mockClear()
    const { rerender } = render(<LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1H" mode="live" preview technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    expect(screen.getByRole('img', { name: /cached preview/ })).toBeTruthy()
    const refreshed = candles.map((candle, index) => index === 0 ? { ...candle, close: 101 } : { ...candle })
    rerender(<LanguageProvider><CandlestickChart candles={refreshed} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    expect(chartMock.candleSeries.setData).toHaveBeenCalledTimes(2)
    expect(chartMock.candleSeries.setData.mock.lastCall?.[0][0].close).toBe(101)
    const tick = [...refreshed.slice(0, -1), { ...refreshed.at(-1)!, close: 101 }]
    rerender(<LanguageProvider><CandlestickChart candles={tick} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    expect(chartMock.candleSeries.setData).toHaveBeenCalledTimes(2)
    expect(chartMock.candleSeries.update).toHaveBeenCalledOnce()
  })
  beforeEach(() => {
    localStorage.clear()
    chartMock.createChart.mockClear()
    chartMock.createPriceLine.mockClear()
    chartMock.removePriceLine.mockClear()
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverMock })
  })

  it('keeps the compact structure summary after the chart and marks expanded layout state', () => {
    render(<LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)

    const chartImage = screen.getByRole('img', { name: /BTC\/KRW 1D TradingView candlestick chart in mock mode/i })
    const chart = chartImage.closest('figure')
    const structure = screen.getByRole('region', { name: 'Chart structure analysis' })
    expect(chart?.getAttribute('data-chart-structure-panel')).toBe('collapsed')
    expect(chartImage.compareDocumentPosition(structure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Expand chart structure' }))
    expect(chart?.getAttribute('data-chart-structure-panel')).toBe('expanded')
    expect(structure.getAttribute('data-layout')).toBe('reserved')

    fireEvent.click(screen.getByRole('button', { name: 'Collapse chart structure' }))
    expect(chart?.getAttribute('data-chart-structure-panel')).toBe('collapsed')
  })

  it('uses lightweight-charts price lines for automatic groups and a distinct user line', async () => {
    render(<LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))

    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.length).toBeGreaterThan(0))
    const automaticOptions = chartMock.createPriceLine.mock.calls.map(([options]) => options as { id: string; title: string })
    expect(automaticOptions.some((options) => options.id.startsWith('automatic:support-'))).toBe(true)
    expect(automaticOptions.some((options) => options.id.startsWith('automatic:resistance-'))).toBe(true)
    expect(automaticOptions.some((options) => options.id.startsWith('automatic:moving-average-'))).toBe(true)
    expect(localStorage.getItem(USER_CHART_LINE_STORAGE_KEY)).toBeNull()

    chartMock.removePriceLine.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Support \/ resistance 4/ }))
    await waitFor(() => expect(chartMock.removePriceLine.mock.calls.some(([line]) => {
      const value = line as { options: { id: string } }
      return value.options.id.startsWith('automatic:support-') || value.options.id.startsWith('automatic:resistance-')
    })).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: /Fibonacci 3/ }))
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.some(([options]) => String((options as { id: string }).id).startsWith('automatic:fibonacci-'))).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: 'Add horizontal line' }))
    fireEvent.change(screen.getByLabelText('Line name'), { target: { value: 'Manual chart review' } })
    fireEvent.change(screen.getByLabelText('Line price'), { target: { value: '103.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save line' }))
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.some(([options]) => {
      const value = options as { id: string; title: string; color: string; lineWidth: number }
      return value.id.startsWith('user:') && value.title === 'Manual chart review' && value.color === '#7051b3' && value.lineWidth === 2
    })).toBe(true))
  })

  it('does not create precise automatic lines when candle data is insufficient', async () => {
    const unavailable = buildTechnicalLevelAnalysis({ instrument, candles: [], language: 'en', dataQuality: 'unavailable' })
    render(<LanguageProvider><CandlestickChart candles={candles.slice(0, 5)} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={unavailable} /></LanguageProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Support \/ resistance 0/ }).hasAttribute('disabled')).toBe(true))
    expect(chartMock.createPriceLine).not.toHaveBeenCalled()
  })

  it('keeps the supplied daily technical levels stable when the display timeframe changes', async () => {
    const view = render(<LanguageProvider><CandlestickChart candles={candles.slice(-20)} instrument={instrument} timeframe="1m" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.length).toBeGreaterThan(0))
    const before = new Map(chartMock.createPriceLine.mock.calls.map(([raw]) => {
      const options = raw as { id: string; price: number }
      return [options.id, options.price]
    }))

    chartMock.createPriceLine.mockClear()
    view.rerender(<LanguageProvider><CandlestickChart candles={candles.slice(-10).map((candle) => ({ ...candle, close: candle.close * 2 }))} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider>)
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.length).toBeGreaterThan(0))
    const after = new Map(chartMock.createPriceLine.mock.calls.map(([raw]) => {
      const options = raw as { id: string; price: number }
      return [options.id, options.price]
    }))
    expect(after).toEqual(before)
  })
})
