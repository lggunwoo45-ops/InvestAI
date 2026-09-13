import { memo } from 'react'

import { chartTimeframes, type ChartTimeframe } from '@/types/marketDetail'
import styles from './TimeframeToolbar.module.css'

interface TimeframeToolbarProps {
  selected: ChartTimeframe
  onSelect: (timeframe: ChartTimeframe) => void
}

export const TimeframeToolbar = memo(function TimeframeToolbar({ selected, onSelect }: TimeframeToolbarProps) {
  return (
    <div className={styles.toolbar} aria-label="Chart timeframe">
      <span>Interval</span>
      {chartTimeframes.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
          aria-pressed={selected === timeframe}
          onClick={() => onSelect(timeframe)}
        >
          {timeframe}
        </button>
      ))}
      <i />
      <span>Mock OHLCV</span>
    </div>
  )
})
