import type { ServiceHealth } from '@/types/service'
import { classNames } from '@/utils/classNames'
import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  label: string
  health: ServiceHealth
}

export function StatusBadge({ label, health }: StatusBadgeProps) {
  return (
    <div className={styles.status} title={`${label}: ${health}`}>
      <span className={classNames(styles.dot, styles[health])} aria-hidden="true" />
      <span>{label}</span>
      <span className={styles.value}>{health === 'unconfigured' ? 'Not configured' : health}</span>
    </div>
  )
}
