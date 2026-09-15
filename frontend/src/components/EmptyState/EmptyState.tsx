import { Icon } from '@/components/Icon/Icon'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  description: string
  compact?: boolean
}

export function EmptyState({ title, description, compact = false }: EmptyStateProps) {
  return (
    <div className={compact ? styles.compact : styles.empty}>
      <span className={styles.icon}><Icon name="empty" size={17} /></span>
      <div>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
      </div>
    </div>
  )
}
