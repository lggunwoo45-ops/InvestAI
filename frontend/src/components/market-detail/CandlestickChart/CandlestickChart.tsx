import { memo, useEffect, useMemo, useRef, useState } from 'react'
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
import { useLanguage } from '@/i18n/useLanguage'
import type { ChartOverlayGroup, ChartOverlayVisibility } from '@/types/chartOverlays'
import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe } from '@/types/marketDetail'
import type { ChartOverlayLine, TechnicalLevelAnalysis } from '@/types/technicalLevels'
import { ChartAnalysisControls } from '../ChartAnalysisControls/ChartAnalysisControls'
import styles from './CandlestickChart.module.css'

interface CandlestickChartProps {
  candles: readonly Candle[]
  instrument: MarketInstrument
  timeframe: ChartTimeframe
  mode: MarketDataMode
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

function overlayColor(line: ChartOverlayLine) {
  if (line.kind === 'support') return '#4f8f83'
  if (line.kind === 'resistance') return '#a45f68'
  if (line.kind === 'movingAverage') return '#a79261'
  return '#677b91'
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

export const CandlestickChart = memo(function CandlestickChart({ candles, instrument, timeframe, mode, technicalAnalysis, technicalLoading = false }: CandlestickChartProps) {
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const dataKeyRef = useRef<string | null>(null)
  const activePriceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
  const initialPriceRef = useRef(instrument.lastPrice)
  const [analysisMode, setAnalysisMode] = useState(false)
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
      ? [{ id: `user:${line.id}`, label: line.label, price: line.price, color: '#8b7da8', style: LineStyle.LargeDashed, width: 2 }]
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
        background: { type: ColorType.Solid, color: '#090e14' },
        textColor: '#526074',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 10,
      },
      grid: { vertLines: { color: '#17212c' }, horzLines: { color: '#17212c' } },
      crosshair: { vertLine: { color: '#526b6a', labelBackgroundColor: '#263737' }, horzLine: { color: '#526b6a', labelBackgroundColor: '#263737' } },
      rightPriceScale: { borderColor: '#26313e', scaleMargins: { top: 0.08, bottom: 0.24 } },
      timeScale: { borderColor: '#26313e', timeVisible: timeframe !== '1D', secondsVisible: false, rightOffset: 4, barSpacing: 7 },
      handleScale: true,
      handleScroll: true,
    })
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#5cae9b', downColor: '#b9636b', wickUpColor: '#5cae9b', wickDownColor: '#b9636b', borderVisible: false,
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
      chart.applyOptions({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) })
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
  }, [instrument.id, instrument.quoteCurrency, timeframe])

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
      color: candle.close >= candle.open ? 'rgba(92, 174, 155, .22)' : 'rgba(185, 99, 107, .22)',
    }))
    const dataKey = `${instrument.id}:${timeframe}`
    if (dataKeyRef.current !== dataKey) {
      candleSeriesRef.current?.setData(candleData)
      volumeSeriesRef.current?.setData(volumeData)
      if (candleData.length > 0) chartRef.current?.timeScale().fitContent()
      dataKeyRef.current = dataKey
      return
    }
    const latestCandle = candleData.at(-1)
    const latestVolume = volumeData.at(-1)
    if (latestCandle) candleSeriesRef.current?.update(latestCandle)
    if (latestVolume) volumeSeriesRef.current?.update(latestVolume)
  }, [candles, instrument.id, timeframe])

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
      const options = { id: line.id, price: line.price, title: line.label, color: line.color, lineWidth: line.width, lineStyle: line.style, lineVisible: true, axisLabelVisible: true }
      const existing = activePriceLinesRef.current.get(line.id)
      if (existing) existing.applyOptions(options)
      else activePriceLinesRef.current.set(line.id, series.createPriceLine(options))
    })
    return undefined
  }, [instrument.id, renderedPriceLines, timeframe])

  return (
    <figure className={styles.chart}>
      <div className={styles.legend}>
        <span>{instrument.symbol}</span><span>{timeframe}</span>
        <span>O {priceLabel.format(latest?.open ?? 0)}</span><span>H {priceLabel.format(latest?.high ?? 0)}</span>
        <span>L {priceLabel.format(latest?.low ?? 0)}</span><span>C {priceLabel.format(latest?.close ?? 0)}</span>
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
      />
      <div ref={containerRef} className={styles.canvas} role="img" aria-label={`${instrument.symbol} ${timeframe} TradingView candlestick chart in ${mode} mode`} />
      <div className={styles.watermark}>TRADINGVIEW LIGHTWEIGHT CHARTS · {mode.toUpperCase()}</div>
    </figure>
  )
})
