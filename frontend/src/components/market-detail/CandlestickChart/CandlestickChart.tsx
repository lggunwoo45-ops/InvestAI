import { memo, useEffect, useMemo, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

import type { MarketDataMode, MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe } from '@/types/marketDetail'
import styles from './CandlestickChart.module.css'

interface CandlestickChartProps {
  candles: readonly Candle[]
  instrument: MarketInstrument
  timeframe: ChartTimeframe
  mode: MarketDataMode
}

export const CandlestickChart = memo(function CandlestickChart({ candles, instrument, timeframe, mode }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const dataKeyRef = useRef<string | null>(null)
  const initialPriceRef = useRef(instrument.lastPrice)
  const latest = candles.at(-1)
  const priceLabel = useMemo(() => new Intl.NumberFormat('en-US', {
    maximumFractionDigits: instrument.quoteCurrency === 'KRW' ? 0 : instrument.lastPrice < 1 ? 4 : 2,
  }), [instrument.lastPrice, instrument.quoteCurrency])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return undefined

    const precision = instrument.quoteCurrency === 'KRW' ? 0 : initialPriceRef.current < 1 ? 4 : 2
    const minimumMove = precision === 0 ? 1 : precision === 4 ? 0.0001 : 0.01
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

  return (
    <figure className={styles.chart} role="img" aria-label={`${instrument.symbol} ${timeframe} TradingView candlestick chart in ${mode} mode`}>
      <div className={styles.legend}>
        <span>{instrument.symbol}</span><span>{timeframe}</span>
        <span>O {priceLabel.format(latest?.open ?? 0)}</span><span>H {priceLabel.format(latest?.high ?? 0)}</span>
        <span>L {priceLabel.format(latest?.low ?? 0)}</span><span>C {priceLabel.format(latest?.close ?? 0)}</span>
      </div>
      <div ref={containerRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.watermark}>TRADINGVIEW LIGHTWEIGHT CHARTS · {mode.toUpperCase()}</div>
    </figure>
  )
})
