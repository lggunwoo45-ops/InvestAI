import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { DataModeControl } from '@/components/market-data/DataModeControl/DataModeControl'
import { marketExplorerText, groupForVenue, venuesByGroup } from '@/pages/Market/marketExplorerConfig'
import { queryMarketInstruments, type BinanceSpotQuoteFilter, type ExplorerSortDirection, type ExplorerSortField } from '@/pages/Market/marketExplorerQuery'
import type { MarketCatalog, MarketDataMode, MarketGroup, MarketInstrument, MarketVenue } from '@/types/market'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from '@/utils/formatMarketValue'
import styles from './MarketExplorer.module.css'

interface MarketExplorerProps {
  venue: MarketVenue
  mode: MarketDataMode
  catalog: MarketCatalog | null
  loading: boolean
  error: string | null
  selectedInstrumentId: string | null
  search: string
  onSearchChange: (value: string) => void
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  sortField: ExplorerSortField
  onSortFieldChange: (value: ExplorerSortField) => void
  sortDirection: ExplorerSortDirection
  spotQuoteFilter: BinanceSpotQuoteFilter
  onSpotQuoteFilterChange: (value: BinanceSpotQuoteFilter) => void
  onSortDirectionChange: (value: ExplorerSortDirection) => void
  favoriteIds: ReadonlySet<string>
  onVenueChange: (venue: MarketVenue) => void
  onModeChange: (mode: MarketDataMode) => void
  onSelect: (instrument: MarketInstrument) => void
  onToggleFavorite: (instrumentId: string) => void
  onRetry: () => void
  onBack?: () => void
  compact?: boolean
}

const text = marketExplorerText.en
const groups: readonly MarketGroup[] = ['crypto', 'korea', 'us']
const sortFields: readonly ExplorerSortField[] = ['alphabet', 'price', 'change', 'volume']
const spotQuotes: readonly BinanceSpotQuoteFilter[] = ['USDT', 'FDUSD', 'BTC', 'ETH', 'Other']

export function MarketExplorer({
  venue, mode, catalog, loading, error, selectedInstrumentId,
  search, onSearchChange, favoritesOnly, onFavoritesOnlyChange,
  sortField, onSortFieldChange, sortDirection, onSortDirectionChange,
  spotQuoteFilter, onSpotQuoteFilterChange,
  favoriteIds, onVenueChange, onModeChange,
  onSelect, onToggleFavorite, onRetry, onBack, compact = false,
}: MarketExplorerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const deferredSearch = useDeferredValue(search)
  const group = groupForVenue(venue)
  const cryptoProvider = venue.startsWith('binance-') ? 'binance' : 'upbit'
  const venues = group === 'crypto'
    ? venuesByGroup.crypto.filter((item) => item.startsWith(cryptoProvider))
    : venuesByGroup[group]
  const instruments = useMemo(() => queryMarketInstruments(catalog?.instruments ?? [], {
    search: deferredSearch, favoritesOnly, favoriteIds, sortField, sortDirection,
    spotQuoteFilter: venue === 'binance-spot' ? spotQuoteFilter : undefined,
  }), [catalog, deferredSearch, favoriteIds, favoritesOnly, sortDirection, sortField, spotQuoteFilter, venue])
  const providerLabel = group === 'crypto' ? text.provider[cryptoProvider] : text.provider.stock
  const source = catalog?.source ?? (group === 'crypto' && mode === 'live' ? 'live' : 'mock')
  const sortLabel = sortField === 'change' ? text.change : text[sortField]
  const directionLabel = sortDirection === 'asc' ? text.ascending : text.descending
  const getItemKey = useCallback((index: number) => instruments[index]?.id ?? index, [instruments])
  const virtualizer = useVirtualizer({
    count: instruments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => compact ? 58 : 62,
    getItemKey,
    overscan: 8,
    useFlushSync: false,
    initialRect: { width: compact ? 260 : 900, height: 600 },
  })
  const rowHeight = compact ? 58 : 62
  const measuredItems = virtualizer.getVirtualItems()
  // The initial rows remain accessible before ResizeObserver reports a viewport.
  const visibleItems = measuredItems.length > 0
    ? measuredItems
    : instruments.slice(0, 20).map((instrument, index) => ({ key: instrument.id, index, start: index * rowHeight }))

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [venue, search, favoritesOnly, sortField, sortDirection, spotQuoteFilter])

  const changeGroup = (next: MarketGroup) => onVenueChange(venuesByGroup[next][0])
  const changeProvider = (provider: 'upbit' | 'binance') =>
    onVenueChange(provider === 'upbit' ? 'upbit-krw' : 'binance-spot')

  return (
    <section className={`${styles.explorer} ${compact ? styles.compact : ''}`} aria-label={text.title}>
      <header className={styles.header}>
        <div>{compact && onBack && <button type="button" className={styles.back} onClick={onBack}>← {text.all}</button>}<span className={styles.eyebrow}>{text.eyebrow}</span><h1>{text.title}</h1></div>
        <div className={styles.count}><DataModeControl value={mode} onChange={onModeChange} /><strong>{instruments.length.toLocaleString()}</strong><span>{text.results}</span></div>
      </header>

      <div className={styles.navigation}>
        <div className={styles.groupTabs} role="tablist" aria-label={text.marketGroup}>
          {groups.map((item) => <button key={item} type="button" role="tab" aria-selected={group === item} onClick={() => changeGroup(item)}>{text.group[item]}</button>)}
        </div>
        {group === 'crypto' && <div className={styles.providerTabs} role="tablist" aria-label={text.cryptoProvider}>
          <button type="button" role="tab" aria-selected={cryptoProvider === 'upbit'} onClick={() => changeProvider('upbit')}>Upbit</button>
          <button type="button" role="tab" aria-selected={cryptoProvider === 'binance'} onClick={() => changeProvider('binance')}>Binance</button>
        </div>}
        <div className={styles.venueTabs} role="tablist" aria-label={text.marketVenue}>
          {venues.map((item) => <button key={item} type="button" role="tab" aria-selected={venue === item} onClick={() => onVenueChange(item)}>{text.venue[item].split(' · ').at(-1)}</button>)}
        </div>
        {venue === 'binance-spot' && <div className={styles.quoteTabs} role="tablist" aria-label="Binance Spot quote asset">
          {spotQuotes.map((quote) => <button key={quote} type="button" role="tab" aria-selected={spotQuoteFilter === quote} onClick={() => onSpotQuoteFilterChange(quote)}>{quote}</button>)}
        </div>}
      </div>

      <div className={styles.controls}>
        <label className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={text.search} aria-label={text.search} /></label>
        <span className={styles.searchBehavior}>{text.searchBehavior}</span>
        <div className={styles.filterRow}>
          <button type="button" className={favoritesOnly ? styles.activeFavorite : ''} aria-pressed={favoritesOnly} onClick={() => onFavoritesOnlyChange(!favoritesOnly)}>★ {text.favorites}</button>
          <label><span>{text.sort}</span><select aria-label={text.sort} value={sortField} onChange={(event) => onSortFieldChange(event.target.value as ExplorerSortField)}>
            {sortFields.map((field) => <option key={field} value={field}>{field === 'change' ? text.change : text[field]}</option>)}
          </select></label>
          <button type="button" className={styles.direction} aria-label={`${text.sort}: ${directionLabel}`} title={`${sortLabel} · ${directionLabel}`} onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'} {directionLabel}</button>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.marketPath}>{text.group[group]} <b>/</b> {providerLabel} <b>/</b> {text.venue[venue].split(' · ').at(-1)}{venue === 'binance-spot' ? ` / ${spotQuoteFilter}` : ''}</span>
        <span className={source === 'live' ? styles.live : styles.mock}>{source === 'live' ? text.realPublicApi : text.mockData}</span>
      </div>
      <div className={styles.sortStatus} role="status">{text.sortedBy} <strong>{sortLabel} {sortDirection === 'asc' ? '↑' : '↓'}</strong><span>{directionLabel} · {instruments.length.toLocaleString()} {text.results}</span></div>
      <div className={styles.tableHead}>
        {sortFields.map((field) => {
          const label = field === 'change' ? text.change : text[field]
          const active = sortField === field
          return <button key={field} type="button" className={active ? styles.activeSort : ''} aria-pressed={active} aria-label={`Sort by ${label}${active ? `, ${directionLabel}` : ''}`} onClick={() => onSortFieldChange(field)}>{label}<span aria-hidden="true">{active ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span></button>
        })}
        <span aria-label={text.favorites}>★</span>
      </div>
      <div className={styles.scroll} ref={scrollRef} role="region" aria-label={`${text.venue[venue]} ${text.instruments}`}>
        {loading && <div className={styles.state}>{text.loading}</div>}
        {!loading && error && <div className={styles.state}><p>{text.sourceUnavailable}</p><small>{error}</small><button type="button" onClick={onRetry}>{text.retry}</button></div>}
        {!loading && !error && instruments.length === 0 && <div className={styles.state}><p>{text.empty}</p>{search && <button type="button" onClick={() => onSearchChange('')}>{text.clearSearch}</button>}</div>}
        {!loading && !error && instruments.length > 0 && <div className={styles.virtualSize} style={{ height: Math.max(virtualizer.getTotalSize(), instruments.length * rowHeight) }}>
          {visibleItems.map((item) => {
            const instrument = instruments[item.index]
            const favorite = favoriteIds.has(instrument.id)
            return <div key={item.key} className={`${styles.row} ${selectedInstrumentId === instrument.id ? styles.selected : ''}`} style={{ transform: `translateY(${item.start}px)` }} data-index={item.index}>
              <button type="button" className={styles.instrument} onClick={() => onSelect(instrument)} aria-label={`${text.open} ${instrument.symbol}`} aria-current={selectedInstrumentId === instrument.id ? 'true' : undefined}>
                <strong>{instrument.displaySymbol ?? instrument.symbol}</strong>
                <small title={[instrument.koreanName, instrument.englishName ?? instrument.name].filter(Boolean).join(' · ')}>
                  {instrument.koreanName ? `${instrument.koreanName} · ${instrument.englishName ?? instrument.name}` : instrument.englishName ?? instrument.name}
                </small>
                {selectedInstrumentId === instrument.id && <em>{text.selected}</em>}
              </button>
              <span className={styles.numeric}>{formatMarketPrice(instrument)}</span>
              <span className={`${styles.numeric} ${instrument.change24hPercent >= 0 ? styles.positive : styles.negative}`}>{formatMarketChange(instrument.change24hPercent)}</span>
              <span className={styles.numeric}>{formatMarketVolume(instrument.volume24h, instrument.quoteCurrency)}</span>
              <button type="button" className={styles.star} aria-label={`${favorite ? text.removeFavorite : text.addFavorite} ${instrument.symbol} ${text.favorite}`} aria-pressed={favorite} onClick={() => onToggleFavorite(instrument.id)}>{favorite ? '★' : '☆'}</button>
            </div>
          })}
        </div>}
      </div>
      {(venue === 'kospi' || venue === 'kosdaq' || venue === 'nasdaq' || venue === 'nyse') && <p className={styles.disclosure}>{text.mockDisclosure}</p>}
    </section>
  )
}
