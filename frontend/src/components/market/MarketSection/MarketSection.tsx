import { useMemo, useState } from 'react'

import { MarketSearch } from '@/components/market/MarketSearch/MarketSearch'
import { MarketTable } from '@/components/market/MarketTable/MarketTable'
import type { MarketInstrument, MarketSectionData } from '@/types/market'
import styles from './MarketSection.module.css'

interface MarketSectionProps {
  section: MarketSectionData
  favoriteIds: ReadonlySet<string>
  selectedInstrumentId: string | null
  onSelect: (instrument: MarketInstrument) => void
  onToggleFavorite: (instrumentId: string) => void
}

export function MarketSection({ section, favoriteIds, selectedInstrumentId, onSelect, onToggleFavorite }: MarketSectionProps) {
  const [query, setQuery] = useState('')
  const visibleInstruments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return section.instruments

    return section.instruments.filter((instrument) =>
      `${instrument.symbol} ${instrument.name}`.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [query, section.instruments])

  return (
    <section className={styles.section} aria-labelledby={`${section.id}-title`}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.marker} aria-hidden="true" />
          <div>
            <h2 id={`${section.id}-title`}>{section.name}</h2>
            <p>{section.description}</p>
          </div>
        </div>
        <div className={styles.tools}>
          <span className={styles.session}>{section.sessionLabel}</span>
          <MarketSearch marketName={section.name} value={query} onChange={setQuery} />
        </div>
      </header>
      <MarketTable
        instruments={visibleInstruments}
        favoriteIds={favoriteIds}
        selectedInstrumentId={selectedInstrumentId}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  )
}
