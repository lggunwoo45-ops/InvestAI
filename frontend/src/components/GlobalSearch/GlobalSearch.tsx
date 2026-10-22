import { matchesInstrumentSearch } from '@/services/market/instrumentSearch'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon/Icon'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useWatchlists } from '@/hooks/useWatchlists'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import type { MarketVenue } from '@/types/market'
import styles from './GlobalSearch.module.css'

const venues: [MarketVenue, string][] = [['upbit-krw', 'Upbit KRW'], ['upbit-btc', 'Upbit BTC'], ['upbit-usdt', 'Upbit USDT'], ['binance-spot', 'Binance Spot'], ['binance-futures', 'Binance Futures'], ['kospi', 'KOSPI'], ['kosdaq', 'KOSDAQ'], ['nasdaq', 'NASDAQ · Demo'], ['nyse', 'NYSE · Demo']]
export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const { selectInstrument, marketDataMode } = useMarketWorkspace()
  const { result: news } = useNewsProviderMode()
  const { trackRecentlyViewed } = useWatchlists()
  const { language } = useLanguage()
  const ko = language === 'ko'
  const text = uiText[language]
  const [query, setQuery] = useState('')
  const [settled, setSettled] = useState('')
  const [venue, setVenue] = useState<MarketVenue>('upbit-krw')
  const [retry, setRetry] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const normalized = query.trim().toLocaleLowerCase()
  useEffect(() => { const timer = setTimeout(() => setSettled(normalized), 200); return () => clearTimeout(timer) }, [normalized])
  const ready = !!normalized && normalized === settled
  const { catalog, loading, error } = useMarketCatalog(venue, marketDataMode, retry, ready)
  const assets = useMemo(() => ready ? (catalog?.instruments ?? []).filter(asset => matchesInstrumentSearch(asset, normalized)).slice(0, 12) : [], [catalog, normalized, ready])
  const articles = useMemo(() => normalized ? (news?.articles ?? []).filter(article => `${article.title} ${article.source} ${article.relatedSymbols.join(' ')}`.toLocaleLowerCase().includes(normalized)).slice(0, 3) : [], [news, normalized])
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])
  return <div className={styles.wrapper} data-compact={compact || undefined} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setQuery('') }} onKeyDown={event => { if (event.key === 'Escape') setQuery('') }}>
    <label className={styles.search}><Icon name="search" size={17} /><input ref={inputRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text.globalSearch} aria-label="Global search" /><kbd>Ctrl K</kbd></label>
    {!!normalized && <div className={styles.results}>
      <label className={styles.label}>{ko ? '찾을 거래소·마켓' : 'Search venue'} <select aria-label="Global search venue" value={venue} onChange={event => { setVenue(event.target.value as MarketVenue); setRetry(0) }}>{venues.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div className={styles.label}>{text.searchMarkets} · {catalog?.source === 'directory' ? (ko ? '종목 목록 · 선택 후 시세 조회' : 'Directory · select to fetch quotes') : catalog?.source === 'mock' ? (ko ? '예시 목록' : 'Demo catalog') : (ko ? '실제 거래소 목록' : 'Exchange catalog')}</div>
      {(!ready || loading) && <p role="status">{ko ? '거래소 목록에서 찾고 있어요…' : 'Searching the exchange catalog…'}</p>}
      {error && <div role="alert"><p>{ko ? '목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.' : 'Catalog unavailable. Please retry.'}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{ko ? '다시 불러오기' : 'Retry'}</button></div>}
      {assets.map(asset => <button key={asset.id} type="button" aria-label={`Open ${asset.symbol} from global search`} onClick={() => { trackRecentlyViewed(asset.id); selectInstrument(asset); navigate('/market'); setQuery('') }}><span><strong>{asset.symbol}</strong><small>{asset.koreanName ?? asset.name}</small></span><em>{asset.marketId}</em></button>)}
      {ready && !loading && !error && assets.length === 0 && <p>{ko ? '이 마켓에서 일치하는 종목이 없어요. 다른 마켓도 선택해보세요.' : 'No matching instruments in this venue. Try another venue.'}</p>}
      <div className={styles.label}>{text.searchNews}</div>
      {articles.map(article => <button key={article.id} type="button" onClick={() => { navigate('/news', { state: { query: article.title.split(' ').slice(0, 3).join(' ') } }); setQuery('') }}><span><strong>{article.title}</strong><small>{article.source}{article.isMock ? ' · Demo' : ''}</small></span></button>)}
      {!articles.length && <p>{ko ? '현재 불러온 뉴스에 일치하는 기사가 없어요.' : 'No matching loaded news.'}</p>}
    </div>}
  </div>
}
