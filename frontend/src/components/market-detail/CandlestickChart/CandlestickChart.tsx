import { memo, useMemo } from 'react'

import type { MarketInstrument } from '@/types/market'
import type { Candle, ChartTimeframe } from '@/types/marketDetail'
import styles from './CandlestickChart.module.css'

interface CandlestickChartProps {
  candles: readonly Candle[]
  instrument: MarketInstrument
  timeframe: ChartTimeframe
}

const width = 1000
const priceTop = 20
const priceBottom = 320
const volumeTop = 346
const volumeBottom = 405

export const CandlestickChart = memo(function CandlestickChart({ candles, instrument, timeframe }: CandlestickChartProps) {
  const geometry = useMemo(() => {
    const lowest = Math.min(...candles.map((candle) => candle.low))
    const highest = Math.max(...candles.map((candle) => candle.high))
    const padding = Math.max((highest - lowest) * 0.08, instrument.lastPrice * 0.001)
    const minPrice = lowest - padding
    const maxPrice = highest + padding
    const priceRange = maxPrice - minPrice
    const maxVolume = Math.max(...candles.map((candle) => candle.volume))
    const slotWidth = width / candles.length
    const mapPrice = (price: number) => priceTop + ((maxPrice - price) / priceRange) * (priceBottom - priceTop)

    return {
      minPrice,
      maxPrice,
      slotWidth,
      mapPrice,
      items: candles.map((candle, index) => ({
        candle,
        x: index * slotWidth + slotWidth / 2,
        openY: mapPrice(candle.open),
        closeY: mapPrice(candle.close),
        highY: mapPrice(candle.high),
        lowY: mapPrice(candle.low),
        volumeHeight: (candle.volume / maxVolume) * (volumeBottom - volumeTop),
        rising: candle.close >= candle.open,
      })),
    }
  }, [candles, instrument.lastPrice])

  const priceLabel = (value: number) => new Intl.NumberFormat('en-US', {
    maximumFractionDigits: instrument.quoteCurrency === 'KRW' ? 0 : value < 1 ? 4 : 2,
  }).format(value)

  return (
    <figure className={styles.chart} aria-label={`${instrument.symbol} ${timeframe} candlestick chart`}>
      <div className={styles.legend}>
        <span>{instrument.symbol}</span>
        <span>{timeframe}</span>
        <span>O {priceLabel(candles.at(-1)?.open ?? 0)}</span>
        <span>H {priceLabel(candles.at(-1)?.high ?? 0)}</span>
        <span>L {priceLabel(candles.at(-1)?.low ?? 0)}</span>
        <span>C {priceLabel(candles.at(-1)?.close ?? 0)}</span>
      </div>
      <svg viewBox="0 0 1000 420" preserveAspectRatio="none" role="img">
        <title>{instrument.symbol} mock candlestick chart at {timeframe}</title>
        {[0, 1, 2, 3, 4].map((line) => {
          const y = priceTop + (line / 4) * (priceBottom - priceTop)
          const price = geometry.maxPrice - (line / 4) * (geometry.maxPrice - geometry.minPrice)
          return <g key={line}><line className={styles.gridLine} x1="0" x2="1000" y1={y} y2={y} /><text className={styles.axisLabel} x="991" y={y - 5} textAnchor="end">{priceLabel(price)}</text></g>
        })}
        {[0, 12, 24, 36, 47].map((index) => {
          const x = index * geometry.slotWidth + geometry.slotWidth / 2
          return <line key={index} className={styles.verticalLine} x1={x} x2={x} y1={priceTop} y2={volumeBottom} />
        })}
        {geometry.items.map(({ candle, x, openY, closeY, highY, lowY, volumeHeight, rising }) => {
          const bodyTop = Math.min(openY, closeY)
          const bodyHeight = Math.max(Math.abs(closeY - openY), 1.4)
          const className = rising ? styles.rising : styles.falling
          return (
            <g key={candle.timestamp} className={className}>
              <line className={styles.wick} x1={x} x2={x} y1={highY} y2={lowY} />
              <rect className={styles.body} x={x - geometry.slotWidth * .27} y={bodyTop} width={geometry.slotWidth * .54} height={bodyHeight} />
              <rect className={styles.volumeBar} x={x - geometry.slotWidth * .3} y={volumeBottom - volumeHeight} width={geometry.slotWidth * .6} height={volumeHeight} />
            </g>
          )
        })}
        <line className={styles.lastPriceLine} x1="0" x2="1000" y1={geometry.mapPrice(instrument.lastPrice)} y2={geometry.mapPrice(instrument.lastPrice)} />
      </svg>
      <div className={styles.watermark}>INVESTAI · SIMULATED DATA</div>
    </figure>
  )
})
