import { useCallback, useState } from 'react'

import { MarketDetailWorkspace } from '@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace'
import { MarketExplorer } from '@/components/market/MarketExplorer/MarketExplorer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketDetailData } from '@/hooks/useMarketDetailData'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import { marketDataService } from '@/services/market/marketDataService'
import { venueForStockId } from '@/services/market/explorer/StockCatalogProvider'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { nextExplorerSort, type BinanceSpotQuoteFilter, type ExplorerSortDirection, type ExplorerSortField } from './marketExplorerQuery'
import styles from './MarketPage.module.css'

function initialVenue(instrument: MarketInstrument): MarketVenue {
  if (instrument.marketType) return instrument.marketType
  if (instrument.marketId === 'upbit') return 'upbit-krw'
  if (instrument.marketId === 'binance-spot') return 'binance-spot'
  if (instrument.marketId === 'binance-futures') return 'binance-futures'
  const stockVenue = venueForStockId(instrument.id)
  if (stockVenue) return stockVenue
  return instrument.marketId === 'korea-stock' ? 'kospi' : 'nasdaq'
}

export function MarketPage() {
  useDocumentTitle('Market Explorer')
  const { selectedInstrument, selectedTimeframe, marketDataMode, selectInstrument, clearInstrument, selectTimeframe, setMarketDataMode } = useMarketWorkspace()
  const { favoriteIds, toggleFavorite, trackRecentlyViewed } = useWatchlists()
  const [venue, setVenue] = useState<MarketVenue>(() => selectedInstrument ? initialVenue(selectedInstrument) : 'upbit-krw')
  const [retry, setRetry] = useState(0)
  // Keep explorer controls stable when the center workspace switches to detail.
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortField, setSortField] = useState<ExplorerSortField>('volume')
  const [sortDirection, setSortDirection] = useState<ExplorerSortDirection>('desc')
  const [spotQuoteFilter, setSpotQuoteFilter] = useState<BinanceSpotQuoteFilter>('USDT')
  const activeVenue = selectedInstrument ? initialVenue(selectedInstrument) : venue
  const catalogState = useMarketCatalog(activeVenue, marketDataMode, retry)
  const detailState = useMarketDetailData(selectedInstrument, selectedTimeframe)

  const openInstrument = useCallback((instrument: MarketInstrument) => {
    setVenue(initialVenue(instrument))
    marketDataService.rememberInstrument(instrument)
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
  }, [selectInstrument, trackRecentlyViewed])
  const changeFavorite = useCallback((id: string) => {
    const instrument = catalogState.catalog?.instruments.find((item) => item.id === id)
    if (instrument) marketDataService.rememberInstrument(instrument)
    toggleFavorite(id)
  }, [catalogState.catalog, toggleFavorite])
  const changeVenue = useCallback((next: MarketVenue) => {
    setVenue(next)
    setSearch('')
    clearInstrument()
  }, [clearInstrument])
  const returnToExplorer = useCallback(() => {
    if (selectedInstrument) setVenue(initialVenue(selectedInstrument))
    clearInstrument()
  }, [clearInstrument, selectedInstrument])
  const changeSortField = useCallback((field: ExplorerSortField) => {
    const next = nextExplorerSort(sortField, sortDirection, field)
    setSortField(next.field)
    setSortDirection(next.direction)
  }, [sortField, sortDirection])

  const explorer = (
    <MarketExplorer
      venue={activeVenue}
      mode={marketDataMode}
      catalog={catalogState.catalog}
      loading={catalogState.loading}
      error={catalogState.error}
      selectedInstrumentId={selectedInstrument?.id ?? null}
      search={search}
      onSearchChange={setSearch}
      favoritesOnly={favoritesOnly}
      onFavoritesOnlyChange={setFavoritesOnly}
      sortField={sortField}
      onSortFieldChange={changeSortField}
      sortDirection={sortDirection}
      spotQuoteFilter={spotQuoteFilter}
      onSpotQuoteFilterChange={setSpotQuoteFilter}
      onSortDirectionChange={setSortDirection}
      favoriteIds={favoriteIds}
      onVenueChange={changeVenue}
      onModeChange={setMarketDataMode}
      onSelect={openInstrument}
      onToggleFavorite={changeFavorite}
      onRetry={() => setRetry((value) => value + 1)}
      onBack={returnToExplorer}
      compact={Boolean(selectedInstrument)}
    />
  )

  if (!selectedInstrument) return <main className={styles.page}>{explorer}</main>

  const snapshot = detailState.state?.snapshot
  const currentSnapshot = snapshot?.instrument.id === selectedInstrument.id && snapshot.timeframe === selectedTimeframe
  if (!currentSnapshot || !detailState.state) {
    return <div className={styles.pendingWorkspace}>
      {explorer}
      <div className={styles.detailState}>{detailState.error ?? `Connecting ${selectedInstrument.symbol} · ${detailState.state?.connection.message ?? 'Preparing market workspace…'}`}</div>
    </div>
  }

  return <MarketDetailWorkspace
    navigator={explorer}
    snapshot={snapshot}
    connection={detailState.state.connection}
    selectedTimeframe={selectedTimeframe}
    onSelectTimeframe={selectTimeframe}
    marketDataMode={marketDataMode}
    onMarketDataModeChange={setMarketDataMode}
  />
}
