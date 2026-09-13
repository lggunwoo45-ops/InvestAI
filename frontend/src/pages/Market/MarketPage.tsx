import { useCallback, useState } from 'react'

import { MarketDetailWorkspace } from '@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace'
import { MarketSection } from '@/components/market/MarketSection/MarketSection'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketDetailData } from '@/hooks/useMarketDetailData'
import { useMarketOverview } from '@/hooks/useMarketOverview'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import styles from './MarketPage.module.css'

export function MarketPage() {
  useDocumentTitle('Market')
  const { sections, isLoading, error } = useMarketOverview()
  const { selectedInstrument, selectedTimeframe, selectInstrument, clearInstrument, selectTimeframe } = useMarketWorkspace()
  const detailState = useMarketDetailData(selectedInstrument, selectedTimeframe)
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(() => new Set(['upbit-btc', 'us-nvda']))

  const toggleFavorite = useCallback((instrumentId: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (next.has(instrumentId)) next.delete(instrumentId)
      else next.add(instrumentId)
      return next
    })
  }, [])

  const hasCurrentSnapshot = detailState.snapshot
    && detailState.snapshot.instrument.id === selectedInstrument?.id
    && detailState.snapshot.timeframe === selectedTimeframe

  if (selectedInstrument) {
    if (detailState.error) return <div className={styles.detailState}>{detailState.error}</div>
    if (!hasCurrentSnapshot) return <div className={styles.detailState}>Preparing {selectedInstrument.symbol} workspace…</div>

    return (
      <MarketDetailWorkspace
        sections={sections}
        snapshot={detailState.snapshot!}
        favoriteIds={favoriteIds}
        selectedTimeframe={selectedTimeframe}
        onSelectInstrument={selectInstrument}
        onSelectTimeframe={selectTimeframe}
        onToggleFavorite={toggleFavorite}
        onBack={clearInstrument}
      />
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>Cross-market terminal</span>
          <h1>Market Overview</h1>
          <p>Monitor global assets and send market context to your AI Copilot.</p>
        </div>
        <div className={styles.snapshot}>
          <span>Data source</span>
          <strong><i /> Simulated market feed</strong>
        </div>
      </header>

      {isLoading && <div className={styles.state}>Loading market workspace…</div>}
      {error && <div className={styles.state}>{error}</div>}
      {!isLoading && !error && (
        <div className={styles.grid} aria-label="Market overview">
          {sections.map((section) => (
            <MarketSection
              key={section.id}
              section={section}
              favoriteIds={favoriteIds}
              selectedInstrumentId={selectedInstrument?.id ?? null}
              onSelect={selectInstrument}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
