import { memo } from 'react'

import type { MarketConnectionState } from '@/types/market'
import styles from './ConnectionIndicator.module.css'

interface ConnectionIndicatorProps {
  connection: MarketConnectionState
  compact?: boolean
}

export const ConnectionIndicator = memo(function ConnectionIndicator({ connection, compact = false }: ConnectionIndicatorProps) {
  const active = connection.status === 'live'
  const pending = connection.status === 'connecting' || connection.status === 'reconnecting'
  return (
    <div className={`${styles.indicator} ${active ? styles.live : pending ? styles.pending : styles.passive}`} role="status" aria-live="polite">
      <i />
      <div>
        <strong>{connection.status.toUpperCase()}</strong>
        {!compact && <span>{connection.provider} · {connection.message}</span>}
      </div>
    </div>
  )
})
