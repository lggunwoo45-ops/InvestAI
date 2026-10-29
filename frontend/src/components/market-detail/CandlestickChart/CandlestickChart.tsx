import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { usePanelSize } from '@/components/workspace/usePanelSize'
import { ResizeHandle } from '@/components/workspace/ResizeHandle'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineStyle,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

import { useUserChartLines } from '@/hooks/useUserChartLines'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import { useLanguage } from '@/i18n/useLanguage'
import type { ChartOverlayGroup, ChartOverlayVisibility } from '@/types/chartOverlays'
import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe } from '@/types/marketDetail'
import type { ChartOverlayLine, TechnicalLevelAnalysis } from '@/types/technicalLevels'
import { ChartAnalysisControls } from '../ChartAnalysisControls/ChartAnalysisControls'
import { loadChartStructurePanelCollapsed } from '../ChartAnalysisControls/chartStructurePanelPreference'
import styles from './CandlestickChart.module.css'

interface CandlestickChartProps {
  candles: readonly Candle[]
  instrument: MarketInstrument
  timeframe: ChartTimeframe
  mode: MarketDataMode
  preview?: boolean
  technicalAnalysis: TechnicalLevelAnalysis
  technicalLoading?: boolean
}

interface RenderedPriceLine {
  id: string
  label: string
  price: number
  color: string
  style: LineStyle
  width: 1 | 2
}

const initialVisibility: ChartOverlayVisibility = {
  supportResistance: true,
  movingAverage: true,
  fibonacci: false,
  user: true,
}

function overlayGroup(line: ChartOverlayLine): ChartOverlayGroup | null {
  if (line.kind === 'support' || line.kind === 'resistance') return 'supportResistance'
  if (line.kind === 'movingAverage') return 'movingAverage'
  if (line.kind === 'fibonacci') return 'fibonacci'
  return null
}

function chartColor(token: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback
}

function overlayColor(line: ChartOverlayLine) {
  if (line.kind === 'support') return chartColor('--color-positive', '#087b5e')
  if (line.kind === 'resistance') return chartColor('--color-danger', '#c0344d')
  if (line.kind === 'movingAverage') return chartColor('--color-warning', '#8d5909')
  return chartColor('--color-accent', '#315eea')
}

function overlayStyle(line: ChartOverlayLine) {
  if (line.style === 'dotted') return LineStyle.Dotted
  if (line.style === 'dashed') return LineStyle.Dashed
  return LineStyle.Solid
}

function chartPricePrecision(price: number, quoteCurrency: string) {
  const absolute = Math.abs(price)
  if (absolute > 0 && absolute < 1) return Math.min(12, Math.max(4, Math.ceil(-Math.log10(absolute)) + 2))
  if (quoteCurrency === 'KRW' && absolute >= 1_000) return 0
  return 2
}

export const CandlestickChart = memo(function CandlestickChart({ candles, instrument, timeframe, mode, preview = false, technicalAnalysis, technicalLoading = false }: CandlestickChartProps) {
  const { language } = useLanguage()
  const compact = useCompactLayout()
  const { displayMode } = useDisplayMode()
  const [height, setHeight] = usePanelSize(`investai.market.panels.${displayMode}.v1.chart-height`, 0, 0, 1200)
  const [actualHeight, setActualHeight] = useState(360)
  useEffect(() => {
    const reset = (e: Event) => { if ((e as CustomEvent).detail === displayMode) setHeight(0) }
    window.addEventListener('investai-market-layout-reset', reset)
    return () => window.removeEventListener('investai-market-layout-reset', reset)
  }, [displayMode, setHeight])
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const dataKeyRef = useRef<string | null>(null)
  const previousCandlesRef = useRef<readonly Candle[]>([])
  const activePriceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
  const initialPriceRef = useRef(instrument.lastPrice)
  const [analysisMode, setAnalysisMode] = useState(false)
  const [chartStructurePanelCollapsed, setChartStructurePanelCollapsed] = useState(loadChartStructurePanelCollapsed)
  const [visibility, setVisibility] = useState<ChartOverlayVisibility>(initialVisibility)
  const { lines: userLines, addLine, updateLine, deleteLine, setLineVisible } = useUserChartLines(instrument.id)
  const latest = candles.at(-1)
  const pricePrecision = chartPricePrecision(instrument.lastPrice, instrument.quoteCurrency)
  const priceLabel = useMemo(() => new Intl.NumberFormat('en-US', {
    maximumFractionDigits: pricePrecision,
  }), [pricePrecision])
  const technicalLines = useMemo(() => technicalAnalysis.levelSet.status === 'ready' ? technicalAnalysis.overlayLines : [], [technicalAnalysis])
  const availableCounts = useMemo<Record<ChartOverlayGroup, number>>(() => ({
    supportResistance: technicalLines.filter((line) => overlayGroup(line) === 'supportResistance').length,
    movingAverage: technicalLines.filter((line) => overlayGroup(line) === 'movingAverage').length,
    fibonacci: technicalLines.filter((line) => overlayGroup(line) === 'fibonacci').length,
    user: userLines.length,
  }), [technicalLines, userLines.length])
  const renderedPriceLines = useMemo<readonly RenderedPriceLine[]>(() => {
    const automatic = technicalLines.flatMap((line): readonly RenderedPriceLine[] => {
      const group = overlayGroup(line)
      if (!group || !visibility[group] || !Number.isFinite(line.price) || line.price <= 0) return []
      return [{ id: `automatic:${line.id}`, label: line.label, price: line.price, color: overlayColor(line), style: overlayStyle(line), width: 1 }]
    })
    const manual = visibility.user ? userLines.flatMap((line): readonly RenderedPriceLine[] => line.visible
      ? [{ id: `user:${line.id}`, label: line.label, price: line.price, color: chartColor('--color-purple', '#7051b3'), style: LineStyle.LargeDashed, width: 2 }]
      : []) : []
    return [...automatic, ...manual]
  }, [technicalLines, userLines, visibility])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return undefined

    const precision = chartPricePrecision(initialPriceRef.current, instrument.quoteCurrency)
    const minimumMove = precision === 0 ? 1 : 10 ** -precision
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: chartColor('--color-surface', '#ffffff') },
        textColor: chartColor('--color-text-muted', '#52637b'),
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: compact ? 12 : 10,
      },
      grid: { vertLines: { color: chartColor('--color-border', '#e2e8f1') }, horzLines: { color: chartColor('--color-border', '#e2e8f1') } },
      crosshair: { vertLine: { color: chartColor('--color-text-muted', '#52637b'), labelBackgroundColor: chartColor('--color-accent', '#315eea') }, horzLine: { color: chartColor('--color-text-muted', '#52637b'), labelBackgroundColor: chartColor('--color-accent', '#315eea') } },
      rightPriceScale: { borderColor: chartColor('--color-border', '#e2e8f1'), scaleMargins: { top: 0.08, bottom: 0.24 } },
      timeScale: { borderColor: chartColor('--color-border', '#e2e8f1'), timeVisible: timeframe !== '1D', secondsVisible: false, rightOffset: 4, barSpacing: 7 },
      handleScale: true,
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: !compact },
    })
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartColor('--color-positive', '#087b5e'), downColor: chartColor('--color-danger', '#c0344d'), wickUpColor: chartColor('--color-positive', '#087b5e'), wickDownColor: chartColor('--color-danger', '#c0344d'), borderVisible: false,
      priceFormat: { type: 'price', precision, minMove: minimumMove },
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false,
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    const activePriceLines = activePriceLinesRef.current

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width < 1 || entry.contentRect.height < 1) return
      const nextHeight = Math.floor(entry.contentRect.height)
      chart.applyOptions({ width: Math.floor(entry.contentRect.width), height: nextHeight })
      setActualHeight(nextHeight)
    })
    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      dataKeyRef.current = null
      activePriceLines.clear()
    }
  }, [compact, instrument.id, instrument.quoteCurrency, timeframe])

  useEffect(() => {
    const candleData: CandlestickData<UTCTimestamp>[] = candles.map((candle) => ({
      time: Math.floor(candle.timestamp / 1_000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }))
    const volumeData: HistogramData<UTCTimestamp>[] = candles.map((candle) => ({
      time: Math.floor(candle.timestamp / 1_000) as UTCTimestamp,
      value: candle.volume,
      color: candle.close >= candle.open ? chartColor('--color-positive-soft', '#e5f5ee') : chartColor('--color-danger-soft', '#fff0f2'),
    }))
    const dataKey = `${instrument.id}:${timeframe}`
    const previous = previousCandlesRef.current
    const firstData = dataKeyRef.current !== dataKey || previous.length === 0
    // REST refreshes can correct older bars; update(last) would leave cached history on screen.
    const incremental = previous.length > 0 && (candles.length === previous.length || candles.length === previous.length + 1)
      && previous.slice(0, -1).every((candle, index) => candle === candles[index])
      && (candles.length === previous.length || previous.at(-1) === candles[previous.length - 1])
    previousCandlesRef.current = candles
    if (dataKeyRef.current !== dataKey || !incremental) {
      candleSeriesRef.current?.setData(candleData)
      volumeSeriesRef.current?.setData(volumeData)
      if (candleData.length > 0 && firstData) {
        if (compact) chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, candleData.length - 45), to: candleData.length + 2 })
        else chartRef.current?.timeScale().fitContent()
      }
      dataKeyRef.current = dataKey
      return
    }
    const latestCandle = candleData.at(-1)
    const latestVolume = volumeData.at(-1)
    if (latestCandle) candleSeriesRef.current?.update(latestCandle)
    if (latestVolume) volumeSeriesRef.current?.update(latestVolume)
  }, [candles, compact, instrument.id, timeframe])

  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return undefined
    const nextIds = new Set(renderedPriceLines.map((line) => line.id))
    activePriceLinesRef.current.forEach((priceLine, id) => {
      if (nextIds.has(id)) return
      try { series.removePriceLine(priceLine) } catch { /* The chart may have been replaced during an instrument change. */ }
      activePriceLinesRef.current.delete(id)
    })
    renderedPriceLines.forEach((line) => {
      const showLabel = !compact || analysisMode || line.id.startsWith('user:')
      const options = { id: line.id, price: line.price, title: showLabel ? line.label : '', color: line.color, lineWidth: line.width, lineStyle: line.style, lineVisible: true, axisLabelVisible: showLabel }
      const existing = activePriceLinesRef.current.get(line.id)
      if (existing) existing.applyOptions(options)
      else activePriceLinesRef.current.set(line.id, series.createPriceLine(options))
    })
    return undefined
  }, [analysisMode, compact, instrument.id, renderedPriceLines, timeframe])

  return (
    <figure style={{ '--chart-height': height ? `min(${Math.max(280, height)}px, max(280px, calc(100dvh - 300px)))` : undefined } as CSSProperties} className={styles.chart} data-chart-structure-panel={chartStructurePanelCollapsed ? 'collapsed' : 'expanded'}>
      <div className={styles.legend}>
        <span>{instrument.symbol}</span><span>{timeframe}</span>
        <span>O {priceLabel.format(latest?.open ?? 0)}</span><span>H {priceLabel.format(latest?.high ?? 0)}</span>
        <span>L {priceLabel.format(latest?.low ?? 0)}</span><span>C {priceLabel.format(latest?.close ?? 0)}</span>
      </div>
      <div className={styles.chartViewport}>
        <div ref={containerRef} className={styles.canvas} role="img" aria-label={`${instrument.symbol} ${timeframe} TradingView candlestick chart in ${preview ? 'cached preview' : mode} mode`} />
        <div className={styles.watermark}>TRADINGVIEW LIGHTWEIGHT CHARTS · {preview ? 'CACHED PREVIEW' : mode.toUpperCase()}</div>
      </div>
      <ResizeHandle axis="height" label={language === 'ko' ? '차트 높이 조절' : 'Resize chart height'} value={actualHeight} min={280} max={1200} onChange={setHeight} onReset={() => setHeight(0)} />
      <div className={styles.sizeControls}>
        <label>{language === 'ko' ? '차트 높이' : 'Chart height'} <input aria-label={language === 'ko' ? '차트 높이' : 'Chart height'} type="range" min={280} max={1200} step={10} value={Math.min(1200, Math.max(280, actualHeight))} onChange={e => setHeight(Number(e.target.value))} /></label>
        <span>{height ? `${actualHeight}px` : language === 'ko' ? '화면에 맞춤' : 'Automatic'}</span>
        <button type="button" onClick={() => setHeight(0)} disabled={!height}>{language === 'ko' ? '자동 높이' : 'Auto height'}</button>
      </div>
      <ChartAnalysisControls
        language={language}
        analysisMode={analysisMode}
        visibility={visibility}
        availableCounts={availableCounts}
        userLines={userLines}
        technicalAnalysis={technicalAnalysis}
        technicalLoading={technicalLoading}
        currentPrice={latest?.close ?? instrument.lastPrice}
        onToggleAnalysisMode={() => setAnalysisMode((current) => !current)}
        onToggleGroup={(group) => setVisibility((current) => ({ ...current, [group]: !current[group] }))}
        onAddLine={addLine}
        onUpdateLine={updateLine}
        onDeleteLine={deleteLine}
        onSetLineVisible={setLineVisible}
        onPanelStateChange={setChartStructurePanelCollapsed}
      />
    </figure>
  )
})
