import { useCallback } from 'react'

import { MarketDetailWorkspace } from '@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace'
import { DataModeControl } from '@/components/market-data/DataModeControl/DataModeControl'
import { MarketSection } from '@/components/market/MarketSection/MarketSection'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketDetailData } from '@/hooks/useMarketDetailData'
import { useMarketOverview } from '@/hooks/useMarketOverview'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import type { MarketInstrument } from '@/types/market'
import styles from './MarketPage.module.css'

export function MarketPage() {
  useDocumentTitle('Market')
  const { sections, isLoading, error } = useMarketOverview()
  const { selectedInstrument, selectedTimeframe, marketDataMode, selectInstrument, clearInstrument, selectTimeframe, setMarketDataMode } = useMarketWorkspace()
  const { favoriteIds, toggleFavorite, trackRecentlyViewed } = useWatchlists()
  const detailState = useMarketDetailData(selectedInstrument, selectedTimeframe)
  const openInstrument = useCallback((instrument: MarketInstrument) => {
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
  }, [selectInstrument, trackRecentlyViewed])

  const snapshot = detailState.state?.snapshot
  const hasCurrentSnapshot = snapshot
    && snapshot.instrument.id === selectedInstrument?.id
    && snapshot.timeframe === selectedTimeframe

  if (selectedInstrument) {
    if (detailState.error) return <div className={styles.detailState}>{detailState.error}</div>
    if (!hasCurrentSnapshot) return <div className={styles.detailState}>Connecting {selectedInstrument.symbol} · {detailState.state?.connection.message ?? 'Preparing market workspace…'}</div>

    return (
      <MarketDetailWorkspace
        sections={sections}
        snapshot={snapshot!}
        connection={detailState.state!.connection}
        favoriteIds={favoriteIds}
        selectedTimeframe={selectedTimeframe}
        onSelectInstrument={openInstrument}
        onSelectTimeframe={selectTimeframe}
        marketDataMode={marketDataMode}
        onMarketDataModeChange={setMarketDataMode}
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
          <DataModeControl value={marketDataMode} onChange={setMarketDataMode} />
          <strong><i className={marketDataMode === 'live' ? styles.liveDot : undefined} /> {marketDataMode === 'live' ? 'Live for Upbit & Binance' : 'Simulated market feed'}</strong>
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
              onSelect={openInstrument}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
