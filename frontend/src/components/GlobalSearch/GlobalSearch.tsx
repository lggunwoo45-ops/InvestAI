import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Icon } from '@/components/Icon/Icon'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import type { MarketInstrument } from '@/types/market'
import styles from './GlobalSearch.module.css'

export function GlobalSearch() {
  const navigate = useNavigate()
  const dashboard = useDashboardData()
  const { selectInstrument } = useMarketWorkspace()
  const { trackRecentlyViewed } = useWatchlists()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const normalized = query.trim().toLocaleLowerCase()
  const assets = useMemo(() => {
    if (!normalized || !dashboard) return []
    const unique = new Map(Object.values(dashboard.discover).flat().map((asset) => [asset.instrumentId, asset]))
    return [...unique.values()].filter((asset) => `${asset.symbol} ${asset.name}`.toLocaleLowerCase().includes(normalized)).slice(0, 5)
  }, [dashboard, normalized])
  const articles = useMemo(() => normalized && dashboard ? dashboard.news.filter((article) => `${article.title} ${article.source} ${article.relatedSymbols.join(' ')}`.toLocaleLowerCase().includes(normalized)).slice(0, 3) : [], [dashboard, normalized])
  const isOpen = normalized.length > 0

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <div className={styles.wrapper} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setQuery('') }}>
      <label className={styles.search}><Icon name="search" size={17} /><input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coins, stocks, or news" aria-label="Global search" /><kbd>Ctrl K</kbd></label>
      {isOpen && <div className={styles.results}>
        <div className={styles.label}>MARKETS</div>
        {assets.map((asset) => <button key={asset.id} type="button" aria-label={`Open ${asset.symbol} from global search`} onClick={() => { const instrument: MarketInstrument = { id: asset.instrumentId, marketId: asset.marketId, symbol: asset.symbol, name: asset.name, quoteCurrency: asset.quote, lastPrice: asset.price, change24hPercent: asset.changePercent, volume24h: asset.volume }; trackRecentlyViewed(instrument.id); selectInstrument(instrument); navigate('/market'); setQuery('') }}><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span><em>{asset.marketId.replace('-', ' ')}</em></button>)}
        <div className={styles.label}>NEWS</div>
        {articles.map((article) => <button key={article.id} type="button" onClick={() => { navigate('/news', { state: { query: article.title.split(' ').slice(0, 3).join(' ') } }); setQuery('') }}><span><strong>{article.title}</strong><small>{article.source}</small></span><em>{article.category}</em></button>)}
        {assets.length === 0 && articles.length === 0 && <p>No results across markets or news.</p>}
      </div>}
    </div>
  )
}
