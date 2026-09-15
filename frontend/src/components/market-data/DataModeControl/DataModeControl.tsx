import { memo } from 'react'

import type { MarketDataMode } from '@/types/market'
import styles from './DataModeControl.module.css'

interface DataModeControlProps {
  value: MarketDataMode
  onChange: (mode: MarketDataMode) => void
}

export const DataModeControl = memo(function DataModeControl({ value, onChange }: DataModeControlProps) {
  return (
    <div className={styles.control} role="group" aria-label="Market data mode">
      {(['live', 'mock'] as const).map((mode) => (
        <button key={mode} type="button" className={value === mode ? styles.active : undefined} aria-pressed={value === mode} onClick={() => onChange(mode)}>
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  )
})
