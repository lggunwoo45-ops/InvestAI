import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Icon } from '@/components/Icon/Icon'
import { NewsCard } from '@/components/news/NewsCard/NewsCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { dashboardService } from '@/services/dashboard/dashboardService'
import type { NewsCategory } from '@/types/dashboard'
import styles from './NewsPage.module.css'

const categories: readonly { id: NewsCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All News' }, { id: 'crypto', label: 'Crypto' }, { id: 'stocks', label: 'Stocks' }, { id: 'economy', label: 'Economy' }, { id: 'technology', label: 'Technology' },
]

export function NewsPage() {
  useDocumentTitle('News')
  const location = useLocation()
  const { selectedInstrument } = useMarketWorkspace()
  const [category, setCategory] = useState<NewsCategory | 'all'>('all')
  const [query, setQuery] = useState(() => (location.state as { query?: string } | null)?.query ?? '')
  const [symbolFilter, setSymbolFilter] = useState(true)
  const articles = useMemo(() => dashboardService.searchNews({ query, category, symbol: symbolFilter ? selectedInstrument?.symbol : null }), [category, query, selectedInstrument?.symbol, symbolFilter])

  return (
    <div className={styles.page}>
      <header className={styles.heading}><div><span>MARKET INTELLIGENCE</span><h1>News Center</h1><p>Searchable, source-aware coverage connected to your active market context.</p></div><div className={styles.context}><span>RELATED MARKET</span><button type="button" disabled={!selectedInstrument} aria-pressed={symbolFilter} onClick={() => setSymbolFilter((current) => !current)}>{selectedInstrument ? `${selectedInstrument.symbol} ${symbolFilter ? 'ON' : 'OFF'}` : 'No symbol selected'}</button></div></header>
      <div className={styles.controls}>
        <label><Icon name="search" size={14} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search headlines, sources, or symbols" aria-label="Search news" /></label>
        <div role="tablist" aria-label="News categories">{categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      </div>
      <div className={styles.resultBar}><span>{articles.length} ARTICLES</span><strong>{selectedInstrument && symbolFilter ? `Filtered for ${selectedInstrument.symbol}` : 'All market coverage'}</strong></div>
      <div className={styles.grid}>{articles.map((article) => <NewsCard key={article.id} article={article} />)}</div>
      {articles.length === 0 && <div className={styles.empty}>No articles match the active filters.</div>}
    </div>
  )
}
