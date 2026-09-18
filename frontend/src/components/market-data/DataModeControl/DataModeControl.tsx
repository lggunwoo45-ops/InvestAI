import { memo } from 'react'

import type { MarketDataMode } from '@/types/market'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import styles from './DataModeControl.module.css'

interface DataModeControlProps {
  value: MarketDataMode
  onChange: (mode: MarketDataMode) => void
}

export const DataModeControl = memo(function DataModeControl({ value, onChange }: DataModeControlProps) {
  const { language } = useLanguage()
  const text = uiText[language]
  return (
    <div className={styles.control} role="group" aria-label={text.dataMode}>
      {(['live', 'mock'] as const).map((mode) => (
        <button key={mode} type="button" className={value === mode ? styles.active : undefined} aria-pressed={value === mode} onClick={() => onChange(mode)}>
          {text[mode]}
        </button>
      ))}
    </div>
  )
})
