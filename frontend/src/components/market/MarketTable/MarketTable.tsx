import { MarketRow } from '@/components/market/MarketRow/MarketRow'
import type { MarketInstrument } from '@/types/market'
import styles from './MarketTable.module.css'

interface MarketTableProps {
  instruments: readonly MarketInstrument[]
  favoriteIds: ReadonlySet<string>
  selectedInstrumentId: string | null
  onSelect: (instrument: MarketInstrument) => void
  onToggleFavorite: (instrumentId: string) => void
}

export function MarketTable({ instruments, favoriteIds, selectedInstrumentId, onSelect, onToggleFavorite }: MarketTableProps) {
  if (instruments.length === 0) {
    return <div className={styles.empty}>No matching symbols</div>
  }

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label="Favorite" />
            <th>Symbol</th>
            <th>Last Price</th>
            <th>24H Change</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {instruments.map((instrument) => (
            <MarketRow
              key={instrument.id}
              instrument={instrument}
              isFavorite={favoriteIds.has(instrument.id)}
              isSelected={selectedInstrumentId === instrument.id}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
