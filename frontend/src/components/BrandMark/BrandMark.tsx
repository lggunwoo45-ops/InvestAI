import styles from './BrandMark.module.css'

interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={styles.brand} aria-label="Market Copilot">
      <span className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className={styles.name}>Market Copilot</span>}
    </div>
  )
}
