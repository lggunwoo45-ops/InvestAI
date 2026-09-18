import type { ServiceHealth } from '@/types/service'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { classNames } from '@/utils/classNames'
import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  label: string
  health: ServiceHealth
}

export function StatusBadge({ label, health }: StatusBadgeProps) {
  const { language } = useLanguage()
  const healthLabel = uiText[language].health[health]
  return (
    <div className={styles.status} title={`${label}: ${healthLabel}`}>
      <span className={classNames(styles.dot, styles[health])} aria-hidden="true" />
      <span>{label}</span>
      <span className={styles.value}>{healthLabel}</span>
    </div>
  )
}
