import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeDisplayMode } from '@/app/displayMode/displayModeStorage'
import { DisplayModeProvider } from '@/app/displayMode/DisplayModeProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { USER_CHART_LINE_STORAGE_KEY } from '@/services/chartOverlays/userChartLineStorage'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { CandlestickChart } from './CandlestickChart'

const chartMock = vi.hoisted(() => {
  const viewport = { compact: false }
  const setVisibleLogicalRange = vi.fn()
  const createPriceLine = vi.fn((options: unknown) => ({ options, applyOptions: vi.fn() }))
  const removePriceLine = vi.fn()
  const candleSeries = { setData: vi.fn(), update: vi.fn(), createPriceLine, removePriceLine, priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) }
  const volumeSeries = { setData: vi.fn(), update: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) }
  const createChart = vi.fn((_container: unknown, _options: unknown) => {
    let seriesIndex = 0
    return {
      addSeries: vi.fn(() => seriesIndex++ === 0 ? candleSeries : volumeSeries),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({ fitContent: vi.fn(), setVisibleLogicalRange })),
      remove: vi.fn(),
    }
  })
  return { createChart, createPriceLine, removePriceLine, candleSeries, volumeSeries, viewport, setVisibleLogicalRange }
})
vi.mock('@/hooks/useCompactLayout', () => ({ useCompactLayout: () => chartMock.viewport.compact }))

vi.mock('lightweight-charts', () => ({
  CandlestickSeries: 'CandlestickSeries',
  HistogramSeries: 'HistogramSeries',
  ColorType: { Solid: 'solid' },
  LineStyle: { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3 },
  createChart: chartMock.createChart,
}))

let chartResize: ResizeObserverCallback
class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) { chartResize = callback }
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
  it('leaves vertical touch scrolling to the page and preserves the phone zoom when history refreshes', () => {
    chartMock.viewport.compact = true
    const { rerender } = render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={[]} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(chartMock.setVisibleLogicalRange).not.toHaveBeenCalled()
    rerender(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(chartMock.createChart.mock.lastCall?.[1]).toMatchObject({ layout: { fontSize: 12 }, handleScroll: { vertTouchDrag: false, horzTouchDrag: true } })
    expect(chartMock.setVisibleLogicalRange).toHaveBeenCalledWith({ from: 15, to: 62 })
    rerender(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles.map(c => ({ ...c }))} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(chartMock.setVisibleLogicalRange).toHaveBeenCalledOnce()
  })
  it('replaces all cached bars when refreshed history corrects an older candle', () => {
    chartMock.candleSeries.setData.mockClear()
    chartMock.candleSeries.update.mockClear()
    const { rerender } = render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1H" mode="live" preview technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(screen.getByRole('img', { name: /cached preview/ })).toBeTruthy()
    const refreshed = candles.map((candle, index) => index === 0 ? { ...candle, close: 101 } : { ...candle })
    rerender(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={refreshed} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(chartMock.candleSeries.setData).toHaveBeenCalledTimes(2)
    expect(chartMock.candleSeries.setData.mock.lastCall?.[0][0].close).toBe(101)
    const tick = [...refreshed.slice(0, -1), { ...refreshed.at(-1)!, close: 101 }]
    rerender(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={tick} instrument={instrument} timeframe="1H" mode="live" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    expect(chartMock.candleSeries.setData).toHaveBeenCalledTimes(2)
    expect(chartMock.candleSeries.update).toHaveBeenCalledOnce()
  })
  beforeEach(() => {
    chartMock.viewport.compact = false
    chartMock.setVisibleLogicalRange.mockClear()
    localStorage.clear()
    chartMock.createChart.mockClear()
    chartMock.createPriceLine.mockClear()
    chartMock.removePriceLine.mockClear()
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverMock })
  })

  it('keeps the compact structure summary after the chart and marks expanded layout state', () => {
    render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)

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
    render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
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
    render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles.slice(0, 5)} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={unavailable} /></LanguageProvider></DisplayModeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Support \/ resistance 0/ }).hasAttribute('disabled')).toBe(true))
    expect(chartMock.createPriceLine).not.toHaveBeenCalled()
  })

  it('keeps the supplied daily technical levels stable when the display timeframe changes', async () => {
    const view = render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles.slice(-20)} instrument={instrument} timeframe="1m" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.length).toBeGreaterThan(0))
    const before = new Map(chartMock.createPriceLine.mock.calls.map(([raw]) => {
      const options = raw as { id: string; price: number }
      return [options.id, options.price]
    }))

    chartMock.createPriceLine.mockClear()
    view.rerender(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles.slice(-10).map((candle) => ({ ...candle, close: candle.close * 2 }))} instrument={instrument} timeframe="1D" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    await waitFor(() => expect(chartMock.createPriceLine.mock.calls.length).toBeGreaterThan(0))
    const after = new Map(chartMock.createPriceLine.mock.calls.map(([raw]) => {
      const options = raw as { id: string; price: number }
      return [options.id, options.price]
    }))
    expect(after).toEqual(before)
  })
  it('resizes the existing chart without resetting its viewed range and remembers manual height until reset', () => {
    writeDisplayMode('expert')
    render(<DisplayModeProvider><LanguageProvider><CandlestickChart candles={candles} instrument={instrument} timeframe="1H" mode="mock" technicalAnalysis={technicalAnalysis} /></LanguageProvider></DisplayModeProvider>)
    const chart = chartMock.createChart.mock.results[0].value
    const initialRangeCalls = chart.timeScale.mock.calls.length
    fireEvent.change(screen.getByRole('slider', {name:'Chart height'}), {target:{value:'700'}})
    expect(localStorage.getItem('investai.market.panels.expert.v1.chart-height')).toBe('700')
    act(() => chartResize([{ contentRect:{width:810,height:468} } as ResizeObserverEntry], {} as ResizeObserver))
    expect(chart.applyOptions).toHaveBeenLastCalledWith({width:810,height:468})
    expect(chartMock.createChart).toHaveBeenCalledTimes(1)
    expect(chart.timeScale.mock.calls.length).toBe(initialRangeCalls)
    act(() => chartResize([{ contentRect:{width:0,height:0} } as ResizeObserverEntry], {} as ResizeObserver))
    expect(chart.applyOptions).toHaveBeenLastCalledWith({width:810,height:468})
    fireEvent.click(screen.getByText('Auto height'))
    expect(localStorage.getItem('investai.market.panels.expert.v1.chart-height')).toBe('0')
    expect(chartMock.createChart).toHaveBeenCalledTimes(1)
  })

})
