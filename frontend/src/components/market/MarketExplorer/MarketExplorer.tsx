import { useWatchlists } from '@/hooks/useWatchlists'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import { getReviewReasons, currentReviewData } from '@/services/watchlist/reviewQueue'
import { ReviewReasonDisplay } from '@/components/market/ReviewReasonDisplay/ReviewReasonDisplay'
import { itemFromInstrument } from '@/services/watchlist/watchlistStorage'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { DataModeControl } from '@/components/market-data/DataModeControl/DataModeControl'
import { useLanguage } from '@/i18n/useLanguage'
import { marketExplorerText, groupForVenue, venuesByGroup } from '@/pages/Market/marketExplorerConfig'
import { queryMarketInstruments, type BinanceSpotQuoteFilter, type ExplorerSortDirection, type ExplorerSortField } from '@/pages/Market/marketExplorerQuery'
import type { MarketCatalog, MarketDataMode, MarketInstrument, MarketVenue } from '@/types/market'
import { formatMarketChange, formatMarketPrice, formatMarketVolume } from '@/utils/formatMarketValue'
import styles from './MarketExplorer.module.css'

interface MarketExplorerProps {
  venue: MarketVenue
  mode: MarketDataMode
  catalog: MarketCatalog | null
  cachedCatalog?: MarketCatalog | null
  loading: boolean
  error: string | null
  selectedInstrumentId: string | null
  activeInstrument?: MarketInstrument | null
  search: string
  onSearchChange: (value: string) => void
  reviewOnly?: boolean
  onReviewOnlyChange?: (value: boolean) => void
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

const sortFields: readonly ExplorerSortField[] = ['alphabet', 'price', 'change', 'volume']
const spotQuotes: readonly BinanceSpotQuoteFilter[] = ['USDT', 'FDUSD', 'BTC', 'ETH', 'Other']

export function MarketExplorer({
  venue, mode, catalog: freshCatalog, cachedCatalog, loading, error, selectedInstrumentId,
  search, onSearchChange, favoritesOnly, onFavoritesOnlyChange,
  reviewOnly: controlledReviewOnly, onReviewOnlyChange,
  sortField, onSortFieldChange, sortDirection, onSortDirectionChange,
  spotQuoteFilter, onSpotQuoteFilterChange,
  favoriteIds, onVenueChange, onModeChange,
  onSelect, onToggleFavorite, onRetry, compact = false,
}: MarketExplorerProps) {
  const { language } = useLanguage()
  const mobile = useCompactLayout()
  const [mobilePage, setMobilePage] = useState({ key: '', index: 0 })
  const text = marketExplorerText[language]
  const catalog = freshCatalog ?? cachedCatalog ?? null
  const showingCached = !freshCatalog && !!cachedCatalog
  const rateLimited = /429|rate-limit/.test(error ?? '')
  const blocked = /418|blocked/.test(error ?? '')
  const errorHelp = venue.startsWith('upbit-')
    ? language === 'ko'
      ? blocked ? '업비트가 요청을 일시 차단했습니다. 잠시 후 다시 시도해 주세요.' : rateLimited ? '업비트 요청 제한으로 목록을 받지 못했습니다. 잠시 후 다시 시도해 주세요.' : '업비트 응답이 지연되거나 연결되지 않습니다. 연결을 확인하고 다시 시도해 주세요.'
      : blocked ? 'Upbit temporarily blocked requests. Wait before retrying.' : rateLimited ? 'Upbit rate-limited this request. Wait before retrying.' : 'Upbit is delayed or unreachable. Check the connection and retry.'
    : text.sourceUnavailable
  const { watchlistItems, getWatchlistItem, activeReview, removeFromWatchlist } = useWatchlists()
  const [localReviewOnly, setLocalReviewOnly] = useState(false)
  const reviewOnly = controlledReviewOnly ?? localReviewOnly
  const setReviewOnly = onReviewOnlyChange ?? setLocalReviewOnly
  const [clock, setClock] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 60_000); return () => window.clearInterval(timer) }, [])
  const reasonsFor = (instrument: MarketInstrument) => getReviewReasons(getWatchlistItem(instrument.id) ?? itemFromInstrument(instrument), currentReviewData(instrument, activeReview), clock)
  const savedRows = (catalog?.instruments ?? []).filter(item => favoriteIds.has(item.id))
  const unavailable = watchlistItems.filter(item => item.marketType === venue && !catalog?.instruments.some(row => row.id === item.instrumentId))
  const savedCount = savedRows.length + unavailable.length
  const reviewCount = savedRows.filter(item => reasonsFor(item).length > 0).length + unavailable.filter(item => getReviewReasons(item, {}, clock).length > 0).length
  const unavailableVisible = favoritesOnly ? unavailable.filter(item => (!reviewOnly || getReviewReasons(item, {}, clock).length > 0) && `${item.symbol} ${item.displayName}`.toLowerCase().includes(search.toLowerCase())) : []
  const scrollRef = useRef<HTMLDivElement>(null)
  const deferredSearch = useDeferredValue(search)
  const group = groupForVenue(venue)
  const isCrypto = group === 'crypto'
  const cryptoProvider = venue.startsWith('binance-') ? 'binance' : 'upbit'
  const venues = group === 'crypto'
    ? venuesByGroup.crypto.filter((item) => item.startsWith(cryptoProvider))
    : venuesByGroup[group]
  const queried = useMemo(() => queryMarketInstruments(catalog?.instruments ?? [], {
    search: deferredSearch, favoritesOnly, favoriteIds, sortField, sortDirection,
    spotQuoteFilter: !favoritesOnly && venue === 'binance-spot' ? spotQuoteFilter : undefined,
  }), [catalog, deferredSearch, favoriteIds, favoritesOnly, sortDirection, sortField, spotQuoteFilter, venue])
  const instruments = reviewOnly && favoritesOnly ? queried.filter(item => reasonsFor(item).length > 0) : queried
  const pageKey = JSON.stringify([venue, deferredSearch, favoritesOnly, reviewOnly, sortField, sortDirection, spotQuoteFilter])
  const pageCount = Math.max(1, Math.ceil(instruments.length / 20))
  const pageIndex = mobilePage.key === pageKey ? Math.min(mobilePage.index, pageCount - 1) : 0
  const changePage = (index: number) => { setMobilePage({ key: pageKey, index }); scrollRef.current?.scrollIntoView?.({ block: 'start' }) }
  const source = catalog?.source ?? (isCrypto && mode === 'live' ? 'live' : 'mock')
  const sortLabel = sortField === 'change' ? text.change : text[sortField]
  const directionLabel = sortDirection === 'asc' ? text.ascending : text.descending
  // A quote badge only distinguishes rows in Binance Spot's mixed-quote view.
  const showQuoteTag = venue === 'binance-spot' && spotQuoteFilter === 'Other'
  const getItemKey = useCallback((index: number) => instruments[index]?.id ?? index, [instruments])
  const virtualizer = useVirtualizer({
    count: mobile ? 0 : instruments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => favoritesOnly ? 78 : 50,
    getItemKey,
    overscan: 8,
    useFlushSync: false,
    initialRect: { width: compact ? 260 : 900, height: 600 },
  })
  const rowHeight = favoritesOnly ? 78 : 50
  const measuredItems = virtualizer.getVirtualItems()
  // The initial rows remain accessible before ResizeObserver reports a viewport.
  const visibleItems = mobile
    ? instruments.slice(pageIndex * 20, (pageIndex + 1) * 20).map((instrument, index) => ({ key: instrument.id, index: pageIndex * 20 + index, start: 0 }))
    : measuredItems.length > 0
    ? measuredItems
    : instruments.slice(0, 20).map((instrument, index) => ({ key: instrument.id, index, start: index * rowHeight }))

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [venue, search, favoritesOnly, reviewOnly, sortField, sortDirection, spotQuoteFilter])

  const changeProvider = (provider: 'upbit' | 'binance') =>
    onVenueChange(provider === 'upbit' ? 'upbit-krw' : 'binance-spot')

  return (
    <section className={`${styles.explorer} ${isCrypto ? styles.crypto : styles.stock} ${compact ? styles.compact : ''}`} data-workspace={isCrypto ? 'crypto' : 'stock'} aria-label={text.title}>
      <header className={styles.header}>
        <strong>{text.layout.instrumentList}</strong>
        <div className={styles.count}><DataModeControl value={mode} onChange={onModeChange} /><span aria-live="polite" aria-atomic="true" aria-label={`${instruments.length.toLocaleString()} ${text.results}`}>{instruments.length.toLocaleString()} {text.results}</span><span className={source === 'live' ? styles.live : styles.mock} title={!isCrypto ? text.mockDisclosure : undefined}>{showingCached ? (language === 'ko' ? '이전 조회 목록' : 'Previous catalog') : source === 'live' ? text.realPublicApi : text.mockData}</span></div>
      </header>

      <div className={styles.navigation} data-market-navigation="hierarchical">
        {isCrypto && <div className={styles.providerSection}>
          <span className={styles.navLabel}>{language === 'ko' ? '거래소' : 'Exchange'}</span>
          <div className={styles.providerTabs} role="tablist" aria-label={text.cryptoProvider}>
            <button type="button" role="tab" aria-selected={cryptoProvider === 'upbit'} onClick={() => changeProvider('upbit')}>Upbit</button>
            <button type="button" role="tab" aria-selected={cryptoProvider === 'binance'} onClick={() => changeProvider('binance')}>Binance</button>
          </div>
        </div>}
        <div className={styles.marketSection}>
          <span className={styles.navLabel}>{language === 'ko' ? (cryptoProvider === 'binance' && isCrypto ? '거래 유형' : '마켓') : (cryptoProvider === 'binance' && isCrypto ? 'Trading type' : 'Market')}</span>
          <div className={styles.venueTabs} role="tablist" aria-label={text.marketVenue}>
            {venues.map((item) => <button key={item} type="button" role="tab" aria-selected={venue === item} onClick={() => onVenueChange(item)}>{text.venue[item].split(' · ').at(-1)}</button>)}
          </div>
        </div>
        {venue === 'binance-spot' && <div className={styles.quoteSection}>
          <span className={styles.navLabel}>{language === 'ko' ? '현물 기준 통화' : 'Spot quote asset'}</span>
          <div className={styles.quoteTabs} role="tablist" aria-label="Binance Spot quote asset">
            {spotQuotes.map((quote) => <button key={quote} type="button" role="tab" aria-selected={spotQuoteFilter === quote} onClick={() => onSpotQuoteFilterChange(quote)}>{quote === 'Other' ? text.other : quote}</button>)}
          </div>
        </div>}
      </div>

      <div className={styles.controls}>
        <div className={styles.filterRow}>
          <div className={styles.scopes} role="group" aria-label={language === 'ko' ? '목록 범위' : 'List scope'}>
            <button type="button" aria-pressed={!favoritesOnly} onClick={() => { onFavoritesOnlyChange(false); setReviewOnly(false) }}>{language === 'ko' ? '전체' : 'All'}</button>
            <button type="button" aria-pressed={favoritesOnly && !reviewOnly} onClick={() => { onFavoritesOnlyChange(true); setReviewOnly(false) }}>{language === 'ko' ? '관심' : 'Watchlist'} {savedCount}</button>
            <button type="button" aria-pressed={favoritesOnly && reviewOnly} onClick={() => { onFavoritesOnlyChange(true); setReviewOnly(true) }}>{language === 'ko' ? '다시 볼 종목' : 'Review queue'} {reviewCount}</button>
          </div>
          <label className={styles.sortFallback}><span>{text.sort}</span><select aria-label={text.sort} value={sortField} onChange={(event) => onSortFieldChange(event.target.value as ExplorerSortField)}>
            {sortFields.map((field) => <option key={field} value={field}>{field === 'change' ? text.change : text[field]}</option>)}
          </select></label>
          <button type="button" className={styles.direction} aria-label={`${text.sort}: ${directionLabel}`} title={`${sortLabel} · ${directionLabel}`} onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'} {directionLabel}</button>
        </div>
      </div>

      {!mobile && <div className={styles.tableHead}>
        {sortFields.map((field) => {
          const label = field === 'change' ? text.change : text[field]
          const active = sortField === field
          return <button key={field} type="button" className={active ? styles.activeSort : ''} aria-pressed={active} aria-label={`${text.sortBy} ${label}${active ? `, ${directionLabel}` : ''}`} onClick={() => onSortFieldChange(field)}>{label}<span aria-hidden="true">{active ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span></button>
        })}
        <span aria-label={text.favorites}>★</span>
      </div>}
      <div className={styles.scroll} ref={scrollRef} role="region" aria-label={`${text.venue[venue]} ${text.instruments}`}>
        {showingCached && catalog && <div className={styles.recovery} role="status">{language === 'ko' ? '재연결 중에는 이전 목록을 표시합니다. 가격은 현재 시세가 아닙니다. 조회 시각: ' : 'Showing the previous list while reconnecting. Prices are not current. Retrieved: '}{new Date(catalog.fetchedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</div>}
        {loading && <div className={styles.recovery} role="status">{venue.startsWith('upbit-') ? (language === 'ko' ? '업비트 응답을 기다리고 있습니다. 일시 실패 시 자동으로 다시 시도합니다.' : 'Waiting for Upbit. Temporary failures are retried automatically.') : text.loading}</div>}
        {!loading && error && <div className={styles.recovery} role="alert"><p>{errorHelp}</p><details><summary>{language === 'ko' ? '오류 정보' : 'Error details'}</summary><small>{error}</small></details><button type="button" onClick={onRetry}>{text.retry}</button></div>}
        {!loading && !error && instruments.length === 0 && unavailableVisible.length === 0 && <div className={styles.state}><p>{favoritesOnly ? (language === 'ko' ? (reviewOnly ? '다시 볼 종목이 없습니다.' : '관심종목이 없습니다.') : (reviewOnly ? 'No instruments need review.' : 'No watchlist items.')) : text.empty}</p>{search && <button type="button" onClick={() => onSearchChange('')}>{text.clearSearch}</button>}</div>}
        {instruments.length > 0 && <div className={mobile ? styles.mobileCards : styles.virtualSize} style={mobile ? undefined : { height: Math.max(virtualizer.getTotalSize(), instruments.length * rowHeight) }}>
          {visibleItems.map((item) => {
            const instrument = instruments[item.index]
            const favorite = favoriteIds.has(instrument.id)
            return <div key={item.key} className={`${styles.row} ${favoritesOnly ? styles.reviewRow : ''} ${selectedInstrumentId === instrument.id ? styles.selected : ''}`} style={mobile ? undefined : { transform: `translateY(${item.start}px)` }} data-index={item.index}>
              <button type="button" className={styles.instrument} onClick={() => onSelect(instrument)} aria-label={`${text.open} ${instrument.symbol}`} aria-current={selectedInstrumentId === instrument.id ? 'true' : undefined}>
                <span className={styles.identityLine}>
                  <strong>{instrument.displaySymbol ?? instrument.symbol}</strong>
                  {showQuoteTag && <span className={styles.identityTag}>{instrument.quoteCurrency}</span>}
                </span>
                <small title={[instrument.koreanName, instrument.englishName ?? instrument.name].filter(Boolean).join(' · ')}>
                  {instrument.koreanName ? `${instrument.koreanName} · ${instrument.englishName ?? instrument.name}` : instrument.englishName ?? instrument.name}
                </small>
                {favoritesOnly && <span className={styles.reviewReason}><ReviewReasonDisplay item={getWatchlistItem(instrument.id) ?? itemFromInstrument(instrument)} current={activeReview?.instrumentId === instrument.id ? activeReview.snapshot : undefined} reasons={reasonsFor(instrument)} language={language} /></span>}
                {selectedInstrumentId === instrument.id && <em>{text.selected}</em>}
              </button>
              <span className={styles.numeric}>{mobile && <small>{text.price}</small>}{formatMarketPrice(instrument)}</span>
              <span className={`${styles.numeric} ${instrument.change24hPercent >= 0 ? styles.positive : styles.negative}`}>{mobile && <small>{text.change}</small>}{formatMarketChange(instrument.change24hPercent)}</span>
              <span className={styles.numeric}>{mobile && <small>{text.volume}</small>}{formatMarketVolume(instrument.volume24h, instrument.quoteCurrency)}</span>
              <button type="button" className={styles.star} aria-label={`${language === 'ko' ? (favorite ? '관심 해제' : '관심 등록') : (favorite ? 'Remove from watchlist' : 'Add to watchlist')} ${instrument.symbol}`} aria-pressed={favorite} onClick={() => onToggleFavorite(instrument.id)}>{favorite ? '★' : '☆'}</button>
            </div>
          })}
        </div>}
        {mobile && instruments.length > 0 && <nav className={styles.mobilePagination} aria-label={language === 'ko' ? '종목 목록 페이지' : 'Instrument list pages'}>
          <button type="button" disabled={pageIndex === 0} onClick={() => changePage(pageIndex - 1)}>{language === 'ko' ? '이전' : 'Previous'}</button>
          <span>{pageIndex + 1} / {pageCount}</span>
          <button type="button" disabled={pageIndex === pageCount - 1} onClick={() => changePage(pageIndex + 1)}>{language === 'ko' ? '다음' : 'Next'}</button>
        </nav>}
        {!loading && favoritesOnly && unavailableVisible.map(item => <div key={item.instrumentId} className={styles.unavailable}>
          <strong>{item.symbol} · {item.displayName}</strong><ReviewReasonDisplay item={item} reasons={getReviewReasons(item, {}, clock)} language={language} />
          <button type="button" aria-label={`${language === 'ko' ? '관심 해제' : 'Remove from watchlist'} ${item.symbol}`} onClick={() => removeFromWatchlist(item.instrumentId)}>★</button>
        </div>)}
      </div>
    </section>
  )
}
