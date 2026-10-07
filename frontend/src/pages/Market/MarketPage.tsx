import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { DisplayModeNotice } from '@/components/displayMode/DisplayModeNotice/DisplayModeNotice'
import { MarketDetailWorkspace } from '@/components/market-detail/MarketDetailWorkspace/MarketDetailWorkspace'
import { MarketExplorer } from '@/components/market/MarketExplorer/MarketExplorer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketDetailData } from '@/hooks/useMarketDetailData'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { marketDataService } from '@/services/market/marketDataService'
import { venueForStockId } from '@/services/market/explorer/StockCatalogProvider'
import type { MarketInstrument, MarketVenue } from '@/types/market'
import { nextExplorerSort, type BinanceSpotQuoteFilter, type ExplorerSortDirection, type ExplorerSortField } from './marketExplorerQuery'
import {
  assetModeForInstrument,
  assetModeForVenue,
  defaultVenueByAssetMode,
  isSelectableMarketInstrument,
  loadLastMarketInstrumentIds,
  loadMarketAssetMode,
  saveLastMarketInstrumentIds,
  saveMarketAssetMode,
  selectDefaultInstrument,
  venueForPersistedInstrumentId,
  type LastMarketInstrumentIds,
  type MarketAssetMode,
} from './marketAssetMode'
import { marketExplorerText } from './marketExplorerConfig'
import styles from './MarketPage.module.css'

const MARKET_LIST_COLLAPSED_KEY = 'market-copilot.market-list-collapsed.v1'
const NARROW_MARKET_QUERY = '(max-width: 900px)'

function initialMarketListCollapsed() {
  try {
    const stored = window.localStorage.getItem(MARKET_LIST_COLLAPSED_KEY)
    if (stored === 'true' || stored === 'false') return stored === 'true'
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_MARKET_QUERY).matches
}

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
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  useDocumentTitle(marketExplorerText[language].title)
  const { selectedInstrument, selectedTimeframe, marketDataMode, selectInstrument, clearInstrument, selectTimeframe, setMarketDataMode } = useMarketWorkspace()
  const { favoriteIds, toggleFavorite, trackRecentlyViewed } = useWatchlists()
  const [initialLastInstrumentIds] = useState(loadLastMarketInstrumentIds)
  const lastInstrumentIdsRef = useRef<LastMarketInstrumentIds>(initialLastInstrumentIds)
  const synchronizedInstrumentIdRef = useRef<string | null>(null)
  const [assetMode, setAssetMode] = useState<MarketAssetMode>(() => selectedInstrument ? assetModeForInstrument(selectedInstrument) : loadMarketAssetMode())
  const [venue, setVenue] = useState<MarketVenue>(() => {
    if (selectedInstrument) return initialVenue(selectedInstrument)
    const persistedVenue = venueForPersistedInstrumentId(initialLastInstrumentIds[assetMode] ?? '')
    return persistedVenue && assetModeForVenue(persistedVenue) === assetMode ? persistedVenue : defaultVenueByAssetMode[assetMode]
  })
  const [pendingAssetSelection, setPendingAssetSelection] = useState<{ mode: MarketAssetMode, preferredId?: string } | null>(() => (
    selectedInstrument ? null : { mode: assetMode, preferredId: initialLastInstrumentIds[assetMode] }
  ))
  const pendingAssetSelectionRef = useRef(pendingAssetSelection)
  const updatePendingAssetSelection = useCallback((next: { mode: MarketAssetMode, preferredId?: string } | null) => {
    pendingAssetSelectionRef.current = next
    setPendingAssetSelection(next)
  }, [])
  const [retry, setRetry] = useState(0)
  // Keep explorer controls stable when the center workspace switches to detail.
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortField, setSortField] = useState<ExplorerSortField>('volume')
  const [sortDirection, setSortDirection] = useState<ExplorerSortDirection>('desc')
  const [spotQuoteFilter, setSpotQuoteFilter] = useState<BinanceSpotQuoteFilter>('USDT')
  const [instrumentListCollapsed, setInstrumentListCollapsed] = useState(initialMarketListCollapsed)
  // The explorer's browsing venue is independent of the active chart instrument.
  const catalogState = useMarketCatalog(venue, marketDataMode, retry)
  const detailState = useMarketDetailData(selectedInstrument, selectedTimeframe)

  const openInstrument = useCallback((instrument: MarketInstrument) => {
    const nextAssetMode = assetModeForInstrument(instrument)
    setAssetMode(nextAssetMode)
    saveMarketAssetMode(nextAssetMode)
    updatePendingAssetSelection(null)
    setVenue(initialVenue(instrument))
    marketDataService.rememberInstrument(instrument)
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
  }, [selectInstrument, trackRecentlyViewed, updatePendingAssetSelection])

  useEffect(() => {
    if (!selectedInstrument) {
      synchronizedInstrumentIdRef.current = null
      return
    }
    if (synchronizedInstrumentIdRef.current === selectedInstrument.id) return
    synchronizedInstrumentIdRef.current = selectedInstrument.id
    const instrumentAssetMode = assetModeForInstrument(selectedInstrument)
    saveMarketAssetMode(instrumentAssetMode)
    updatePendingAssetSelection(null)
    if (instrumentAssetMode !== assetMode) {
      // oxlint-disable-next-line react/set-state-in-effect -- Route-driven instrument selections must synchronize the local workspace boundary.
      setAssetMode(instrumentAssetMode)
      setSearch('')
    }
    const instrumentVenue = initialVenue(selectedInstrument)
    if (instrumentVenue !== venue) setVenue(instrumentVenue)
    const next = { ...lastInstrumentIdsRef.current, [instrumentAssetMode]: selectedInstrument.id }
    lastInstrumentIdsRef.current = next
    saveLastMarketInstrumentIds(next)
  }, [assetMode, selectedInstrument, updatePendingAssetSelection, venue])

  useLayoutEffect(() => {
    if (pendingAssetSelectionRef.current !== pendingAssetSelection) return
    if (!pendingAssetSelection || pendingAssetSelection.mode !== assetMode || !catalogState.catalog) return
    if (assetModeForVenue(catalogState.catalog.venue) !== assetMode) return

    const preferred = pendingAssetSelection.preferredId
      ? catalogState.catalog.instruments.find((instrument) => instrument.id === pendingAssetSelection.preferredId && isSelectableMarketInstrument(instrument))
      : undefined
    if (preferred) {
      // oxlint-disable-next-line react/set-state-in-effect -- The safe default can only be selected after its asynchronous catalog has loaded.
      openInstrument(preferred)
      return
    }

    if (pendingAssetSelection.preferredId && venue !== defaultVenueByAssetMode[assetMode]) {
      setVenue(defaultVenueByAssetMode[assetMode])
      updatePendingAssetSelection({ mode: assetMode })
      return
    }

    const fallback = selectDefaultInstrument(assetMode, catalogState.catalog.instruments)
    if (fallback) openInstrument(fallback)
  }, [assetMode, catalogState.catalog, openInstrument, pendingAssetSelection, updatePendingAssetSelection, venue])
  const changeFavorite = useCallback((id: string) => {
    const instrument = catalogState.catalog?.instruments.find((item) => item.id === id)
    if (instrument) marketDataService.rememberInstrument(instrument)
    toggleFavorite(id)
  }, [catalogState.catalog, toggleFavorite])
  const changeVenue = useCallback((next: MarketVenue) => {
    const nextAssetMode = assetModeForVenue(next)
    if (nextAssetMode !== assetMode) {
      const persistedId = lastInstrumentIdsRef.current[nextAssetMode]
      const persistedVenue = persistedId ? venueForPersistedInstrumentId(persistedId) : undefined
      const safePreferredId = persistedVenue && assetModeForVenue(persistedVenue) === nextAssetMode ? persistedId : undefined
      setAssetMode(nextAssetMode)
      saveMarketAssetMode(nextAssetMode)
      clearInstrument()
      updatePendingAssetSelection({ mode: nextAssetMode, preferredId: safePreferredId })
      setVenue(persistedVenue && safePreferredId ? persistedVenue : defaultVenueByAssetMode[nextAssetMode])
    } else {
      setVenue(next)
    }
    setSearch('')
  }, [assetMode, clearInstrument, updatePendingAssetSelection])
  const returnToExplorer = useCallback(() => {
    clearInstrument()
  }, [clearInstrument])
  const changeSortField = useCallback((field: ExplorerSortField) => {
    const next = nextExplorerSort(sortField, sortDirection, field)
    setSortField(next.field)
    setSortDirection(next.direction)
  }, [sortField, sortDirection])
  const toggleInstrumentList = useCallback(() => {
    setInstrumentListCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(MARKET_LIST_COLLAPSED_KEY, String(next))
      } catch {
        // The layout remains usable for this session when persistence is blocked.
      }
      return next
    })
  }, [])

  const explorerPanel = (
    <MarketExplorer
      venue={venue}
      mode={marketDataMode}
      catalog={catalogState.catalog}
      loading={catalogState.loading}
      error={catalogState.error}
      selectedInstrumentId={selectedInstrument?.id ?? null}
      activeInstrument={selectedInstrument}
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
  const listIsCollapsed = Boolean(selectedInstrument && instrumentListCollapsed)
  const layoutText = marketExplorerText[language].layout
  const explorer = <div className={`${styles.navigator} ${selectedInstrument ? styles.navigatorDetail : ''} ${listIsCollapsed ? styles.navigatorCollapsed : ''}`}>
    {selectedInstrument && <div className={styles.navigatorToolbar}>
      {!listIsCollapsed && <strong>{layoutText.instrumentList}</strong>}
      <button
        type="button"
        aria-controls="market-instrument-list"
        aria-expanded={!listIsCollapsed}
        aria-label={listIsCollapsed ? layoutText.expandInstrumentList : layoutText.collapseInstrumentList}
        title={listIsCollapsed ? layoutText.expandInstrumentList : layoutText.collapseInstrumentList}
        onClick={toggleInstrumentList}
      >
        <span aria-hidden="true">{listIsCollapsed ? '›' : '‹'}</span>
        <em>{listIsCollapsed ? layoutText.expandInstrumentList : layoutText.collapseInstrumentList}</em>
      </button>
    </div>}
    <div id="market-instrument-list" className={styles.navigatorContent} hidden={listIsCollapsed}>
      {displayMode === 'simple' && <DisplayModeNotice variant="panel">{uiText[language].displayMode.marketHint}</DisplayModeNotice>}
      {explorerPanel}
    </div>
  </div>

  if (!selectedInstrument) return <main className={styles.page}>{explorer}</main>

  const snapshot = detailState.state?.snapshot
  const currentSnapshot = snapshot?.instrument.id === selectedInstrument.id && snapshot.timeframe === selectedTimeframe
  if (!currentSnapshot || !detailState.state) {
    return <div className={`${styles.pendingWorkspace} ${listIsCollapsed ? styles.pendingWorkspaceCollapsed : ''}`}>
      {explorer}
      <div className={styles.detailState}>{detailState.error ?? `Connecting ${selectedInstrument.symbol} · ${detailState.state?.connection.message ?? 'Preparing market workspace…'}`}</div>
    </div>
  }

  return <MarketDetailWorkspace
    navigator={explorer}
    instrumentListCollapsed={listIsCollapsed}
    snapshot={snapshot}
    connection={detailState.state.connection}
    selectedTimeframe={selectedTimeframe}
    onSelectTimeframe={selectTimeframe}
    marketDataMode={marketDataMode}
    onMarketDataModeChange={setMarketDataMode}
  />
}
