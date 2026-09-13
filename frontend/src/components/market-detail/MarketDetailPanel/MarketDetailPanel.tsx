import { memo, useMemo } from 'react'

import type { MarketDetailSnapshot, ChartTimeframe } from '@/types/marketDetail'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from '@/utils/formatMarketValue'
import { CandlestickChart } from '../CandlestickChart/CandlestickChart'
import { TimeframeToolbar } from '../TimeframeToolbar/TimeframeToolbar'
import styles from './MarketDetailPanel.module.css'

interface MarketDetailPanelProps {
  snapshot: MarketDetailSnapshot
  selectedTimeframe: ChartTimeframe
  onSelectTimeframe: (timeframe: ChartTimeframe) => void
}

export const MarketDetailPanel = memo(function MarketDetailPanel({ snapshot, selectedTimeframe, onSelectTimeframe }: MarketDetailPanelProps) {
  const { instrument, candles } = snapshot
  const sessionStats = useMemo(() => ({
    high: Math.max(...candles.map((candle) => candle.high)),
    low: Math.min(...candles.map((candle) => candle.low)),
  }), [candles])
  const valueAsInstrument = (value: number) => formatMarketPrice({ ...instrument, lastPrice: value })

  return (
    <section className={styles.detail} aria-label="Market detail">
      <header className={styles.header}>
        <div className={styles.identity}>
          <span>{instrument.marketId.replaceAll('-', ' ')}</span>
          <h1>{instrument.symbol}</h1>
          <p>{instrument.name}</p>
        </div>
        <div className={styles.quote}>
          <strong>{formatMarketPrice(instrument)}</strong>
          <span className={instrument.change24hPercent >= 0 ? styles.positive : styles.negative}>
            {formatMarketChange(instrument.change24hPercent)} · 24H
          </span>
        </div>
      </header>
      <dl className={styles.stats}>
        <div><dt>Market</dt><dd>{instrument.marketId.replaceAll('-', ' ')}</dd></div>
        <div><dt>High</dt><dd>{valueAsInstrument(sessionStats.high)}</dd></div>
        <div><dt>Low</dt><dd>{valueAsInstrument(sessionStats.low)}</dd></div>
        <div><dt>Volume</dt><dd>{formatMarketVolume(instrument.volume24h, instrument.quoteCurrency)}</dd></div>
      </dl>
      <TimeframeToolbar selected={selectedTimeframe} onSelect={onSelectTimeframe} />
      <div className={styles.chartArea}>
        <CandlestickChart candles={candles} instrument={instrument} timeframe={selectedTimeframe} />
      </div>
    </section>
  )
})
