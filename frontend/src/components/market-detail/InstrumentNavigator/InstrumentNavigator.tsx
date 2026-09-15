import { memo, useMemo, useState } from 'react'

import { Icon } from '@/components/Icon/Icon'
import type { MarketInstrument, MarketSectionData } from '@/types/market'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './InstrumentNavigator.module.css'

interface InstrumentNavigatorProps {
  sections: readonly MarketSectionData[]
  selectedInstrumentId: string
  favoriteIds: ReadonlySet<string>
  onSelect: (instrument: MarketInstrument) => void
  onToggleFavorite: (instrumentId: string) => void
  onBack: () => void
}

export const InstrumentNavigator = memo(function InstrumentNavigator({
  sections,
  selectedInstrumentId,
  favoriteIds,
  onSelect,
  onToggleFavorite,
  onBack,
}: InstrumentNavigatorProps) {
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return sections.map((section) => ({
      ...section,
      instruments: section.instruments.filter((instrument) => {
        const matchesQuery = !normalized || `${instrument.symbol} ${instrument.name}`.toLocaleLowerCase().includes(normalized)
        return matchesQuery && (!favoritesOnly || favoriteIds.has(instrument.id))
      }),
    })).filter((section) => section.instruments.length > 0)
  }, [favoriteIds, favoritesOnly, query, sections])

  return (
    <aside className={styles.navigator} aria-label="Market list">
      <div className={styles.topbar}>
        <button type="button" onClick={onBack}>← All markets</button>
        <span>20 instruments</span>
      </div>
      <div className={styles.filters}>
        <label>
          <Icon name="search" size={13} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search markets"
            aria-label="Search market list"
          />
        </label>
        <button
          type="button"
          className={favoritesOnly ? styles.activeFilter : ''}
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly((current) => !current)}
        >
          ★ Favorites
        </button>
      </div>
      <div className={styles.list}>
        {visibleSections.map((section) => (
          <section key={section.id} className={styles.group} aria-labelledby={`navigator-${section.id}`}>
            <h2 id={`navigator-${section.id}`}>{section.name}<span>{section.instruments.length}</span></h2>
            {section.instruments.map((instrument) => (
              <div key={instrument.id} className={`${styles.instrument} ${selectedInstrumentId === instrument.id ? styles.selected : ''}`}>
                <button
                  type="button"
                  className={styles.star}
                  aria-label={`${favoriteIds.has(instrument.id) ? 'Remove' : 'Add'} ${instrument.symbol} favorite`}
                  aria-pressed={favoriteIds.has(instrument.id)}
                  onClick={() => onToggleFavorite(instrument.id)}
                >
                  {favoriteIds.has(instrument.id) ? '★' : '☆'}
                </button>
                <button type="button" className={styles.instrumentButton} onClick={() => onSelect(instrument)}>
                  <span><strong>{instrument.symbol}</strong><small>{instrument.name}</small></span>
                  <span><strong>{formatMarketPrice(instrument)}</strong><small className={instrument.change24hPercent >= 0 ? styles.positive : styles.negative}>{formatMarketChange(instrument.change24hPercent)}</small></span>
                </button>
              </div>
            ))}
          </section>
        ))}
        {visibleSections.length === 0 && <p className={styles.empty}>No matching instruments</p>}
      </div>
    </aside>
  )
})
