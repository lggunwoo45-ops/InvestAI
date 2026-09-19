import styles from './NewsFilterSummary.module.css'

export interface ActiveNewsFilter {
  id: string
  label: string
  value: string
  onRemove: () => void
}

interface NewsFilterSummaryProps {
  filters: readonly ActiveNewsFilter[]
  title: string
  clearAllLabel: string
  removeLabel: string
  onClearAll: () => void
}

/** Keeps every active news constraint visible and independently reversible. */
export function NewsFilterSummary({ filters, title, clearAllLabel, removeLabel, onClearAll }: NewsFilterSummaryProps) {
  if (filters.length === 0) return null

  return (
    <section className={styles.summary} aria-label={title}>
      <span className={styles.title}>{title} <strong>{filters.length}</strong></span>
      <div className={styles.chips}>
        {filters.map((filter) => (
          <button key={filter.id} type="button" className={styles.chip} onClick={filter.onRemove} aria-label={`${removeLabel}: ${filter.label} ${filter.value}`}>
            <span>{filter.label}</span>{filter.value}<b aria-hidden="true">×</b>
          </button>
        ))}
      </div>
      <button type="button" className={styles.clear} onClick={onClearAll}>{clearAllLabel}</button>
    </section>
  )
}
