import { classNames } from '@/utils/classNames'
import type { MarketInstrument } from '@/types/market'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from '@/utils/formatMarketValue'
import styles from './MarketRow.module.css'

interface MarketRowProps {
  instrument: MarketInstrument
  isFavorite: boolean
  isSelected: boolean
  onSelect: (instrument: MarketInstrument) => void
  onToggleFavorite: (instrumentId: string) => void
}

export function MarketRow({ instrument, isFavorite, isSelected, onSelect, onToggleFavorite }: MarketRowProps) {
  const changeClass = instrument.change24hPercent >= 0 ? styles.positive : styles.negative

  return (
    <tr className={classNames(styles.row, isSelected && styles.selected)} onClick={() => onSelect(instrument)}>
      <td className={styles.favoriteCell}>
        <button
          type="button"
          className={classNames(styles.favorite, isFavorite && styles.favoriteActive)}
          aria-label={`${isFavorite ? 'Remove' : 'Add'} ${instrument.symbol} favorite`}
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite(instrument.id)
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </td>
      <th scope="row">
        <button type="button" className={styles.symbolButton} onClick={() => onSelect(instrument)}>
          <strong>{instrument.symbol}</strong>
          <span>{instrument.name}</span>
        </button>
      </th>
      <td className={styles.price}>{formatMarketPrice(instrument)}</td>
      <td className={classNames(styles.change, changeClass)}>{formatMarketChange(instrument.change24hPercent)}</td>
      <td className={styles.volume}>{formatMarketVolume(instrument.volume24h, instrument.quoteCurrency)}</td>
    </tr>
  )
}
