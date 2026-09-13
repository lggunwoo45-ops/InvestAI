import styles from './WhyPlaceholder.module.css'

interface WhyPlaceholderProps {
  compact?: boolean
}

export function WhyPlaceholder({ compact = false }: WhyPlaceholderProps) {
  return (
    <div className={compact ? styles.compact : styles.why} aria-label="Recommendation explanation">
      <strong>Why?</strong>
      <span>Not implemented yet</span>
    </div>
  )
}
