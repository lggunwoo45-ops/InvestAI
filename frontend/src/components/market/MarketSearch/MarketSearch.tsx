import { Icon } from '@/components/Icon/Icon'
import styles from './MarketSearch.module.css'

interface MarketSearchProps {
  marketName: string
  value: string
  onChange: (value: string) => void
}

export function MarketSearch({ marketName, value, onChange }: MarketSearchProps) {
  return (
    <label className={styles.search}>
      <Icon name="search" size={13} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search symbol"
        aria-label={`Search ${marketName}`}
      />
    </label>
  )
}
