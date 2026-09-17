import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { DataModeControl } from '@/components/market-data/DataModeControl/DataModeControl'
import { marketExplorerText, groupForVenue, venuesByGroup } from '@/pages/Market/marketExplorerConfig'
import { queryMarketInstruments, type ExplorerSortDirection, type ExplorerSortField } from '@/pages/Market/marketExplorerQuery'
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

export function MarketExplorer({
  venue, mode, catalog, loading, error, selectedInstrumentId,
  search, onSearchChange, favoritesOnly, onFavoritesOnlyChange,
  sortField, onSortFieldChange, sortDirection, onSortDirectionChange,
  favoriteIds, onVenueChange, onModeChange,
  onSelect, onToggleFavorite, onRetry, onBack, compact = false,
}: MarketExplorerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const group = groupForVenue(venue)
  const cryptoProvider = venue.startsWith('binance-') ? 'binance' : 'upbit'
  const venues = group === 'crypto'
    ? venuesByGroup.crypto.filter((item) => item.startsWith(cryptoProvider))
    : venuesByGroup[group]
  const instruments = useMemo(() => queryMarketInstruments(catalog?.instruments ?? [], {
    search, favoritesOnly, favoriteIds, sortField, sortDirection,
  }), [catalog, favoriteIds, favoritesOnly, search, sortDirection, sortField])
  const getItemKey = useCallback((index: number) => instruments[index]?.id ?? index, [instruments])
  const virtualizer = useVirtualizer({
    count: instruments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => compact ? 52 : 54,
    getItemKey,
    overscan: 8,
    useFlushSync: false,
    initialRect: { width: compact ? 260 : 900, height: 600 },
  })
  const rowHeight = compact ? 52 : 54
  const measuredItems = virtualizer.getVirtualItems()
  // The initial rows remain accessible before ResizeObserver reports a viewport.
  const visibleItems = measuredItems.length > 0
    ? measuredItems
    : instruments.slice(0, 20).map((instrument, index) => ({ key: instrument.id, index, start: index * rowHeight }))

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [venue, search, favoritesOnly, sortField, sortDirection])

  const changeGroup = (next: MarketGroup) => onVenueChange(venuesByGroup[next][0])
  const changeProvider = (provider: 'upbit' | 'binance') =>
    onVenueChange(provider === 'upbit' ? 'upbit-krw' : 'binance-spot')

  return (
    <section className={`${styles.explorer} ${compact ? styles.compact : ''}`} aria-label={text.title}>
      <header className={styles.header}>
        <div>{compact && onBack && <button type="button" className={styles.back} onClick={onBack}>← {text.all}</button>}<span className={styles.eyebrow}>{text.eyebrow}</span><h1>{text.title}</h1></div>
        <div className={styles.count}><DataModeControl value={mode} onChange={onModeChange} /><strong>{catalog?.instruments.length.toLocaleString() ?? '—'}</strong><span>{text.all}</span></div>
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
      </div>

      <div className={styles.controls}>
        <label className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={text.search} aria-label={text.search} /></label>
        <div className={styles.filterRow}>
          <button type="button" className={favoritesOnly ? styles.activeFavorite : ''} aria-pressed={favoritesOnly} onClick={() => onFavoritesOnlyChange(!favoritesOnly)}>★ {text.favorites}</button>
          <label><span>{text.sort}</span><select aria-label={text.sort} value={sortField} onChange={(event) => onSortFieldChange(event.target.value as ExplorerSortField)}>
            {sortFields.map((field) => <option key={field} value={field}>{field === 'change' ? text.change : text[field]}</option>)}
          </select></label>
          <button type="button" aria-label={sortDirection === 'asc' ? text.ascending : text.descending} title={sortDirection === 'asc' ? text.ascending : text.descending} onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
        </div>
      </div>

      <div className={styles.meta}>
        <span>{text.venue[venue]} · {instruments.length.toLocaleString()} {text.results}</span>
        <span className={catalog?.source === 'live' ? styles.live : styles.mock}>{catalog?.source === 'live' ? text.live : text.mock}</span>
      </div>
      <div className={styles.tableHead}><span>{text.instrument}</span><span>{text.price}</span><span>{text.change}</span><span>{text.volume}</span><span>★</span></div>
      <div className={styles.scroll} ref={scrollRef} role="region" aria-label={`${text.venue[venue]} ${text.instruments}`}>
        {loading && <div className={styles.state}>{text.loading}</div>}
        {!loading && error && <div className={styles.state}><p>{text.sourceUnavailable}</p><small>{error}</small><button type="button" onClick={onRetry}>{text.retry}</button></div>}
        {!loading && !error && instruments.length === 0 && <div className={styles.state}>{text.empty}</div>}
        {!loading && !error && instruments.length > 0 && <div className={styles.virtualSize} style={{ height: Math.max(virtualizer.getTotalSize(), instruments.length * rowHeight) }}>
          {visibleItems.map((item) => {
            const instrument = instruments[item.index]
            const favorite = favoriteIds.has(instrument.id)
            return <div key={item.key} className={`${styles.row} ${selectedInstrumentId === instrument.id ? styles.selected : ''}`} style={{ transform: `translateY(${item.start}px)` }} data-index={item.index}>
              <button type="button" className={styles.instrument} onClick={() => onSelect(instrument)} aria-label={`${text.open} ${instrument.symbol}`}>
                <strong>{instrument.displaySymbol ?? instrument.symbol}</strong>
                <small title={[instrument.koreanName, instrument.englishName ?? instrument.name].filter(Boolean).join(' · ')}>
                  {instrument.koreanName ? `${instrument.koreanName} · ${instrument.englishName ?? instrument.name}` : instrument.englishName ?? instrument.name}
                </small>
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
