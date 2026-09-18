import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Icon } from '@/components/Icon/Icon'
import { NewsCard } from '@/components/news/NewsCard/NewsCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { dashboardService } from '@/services/dashboard/dashboardService'
import type { NewsCategory } from '@/types/dashboard'
import styles from './NewsPage.module.css'

const categories: readonly NewsCategory[] = ['crypto', 'korea-stock', 'us-stock', 'macro', 'technology', 'ai', 'earnings', 'regulation']

export function NewsPage() {
  const { language } = useLanguage()
  const text = uiText[language].news
  useDocumentTitle(text.title)
  const location = useLocation()
  const { selectedInstrument } = useMarketWorkspace()
  const [category, setCategory] = useState<NewsCategory | 'all'>('all')
  const [query, setQuery] = useState(() => (location.state as { query?: string } | null)?.query ?? '')
  // A direct headline link must remain visible even when another instrument is active.
  const [symbolFilter, setSymbolFilter] = useState(() => !(location.state as { query?: string } | null)?.query)
  const articles = useMemo(() => dashboardService.searchNews({ query, category, symbol: symbolFilter ? selectedInstrument?.symbol : null }), [category, query, selectedInstrument?.symbol, symbolFilter])

  return (
    <div className={styles.page}>
      <header className={styles.heading}><div><span>MARKET INTELLIGENCE</span><h1>{text.title}</h1><p>{text.subtitle}</p><strong className={styles.demo}>{text.demo}</strong></div><div className={styles.context}><span>{text.relatedMarket}</span><button type="button" disabled={!selectedInstrument} aria-pressed={symbolFilter} onClick={() => setSymbolFilter((current) => !current)}>{selectedInstrument ? `${selectedInstrument.symbol} ${symbolFilter ? text.on : text.off}` : text.noSymbol}</button></div></header>
      <div className={styles.controls}>
        <label><Icon name="search" size={14} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} aria-label="Search news" /></label>
        <div role="tablist" aria-label="News categories"><button type="button" role="tab" aria-selected={category === 'all'} onClick={() => setCategory('all')}>{text.all}</button>{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{text.categories[item]}</button>)}</div>
      </div>
      <p className={styles.trust}>{uiText[language].briefing.trust} {uiText[language].briefing.finalDecision}</p>
      <div className={styles.resultBar}><span>{articles.length} {text.articles}</span><strong>{selectedInstrument && symbolFilter ? `${text.filteredFor} ${selectedInstrument.symbol}` : text.allCoverage}</strong></div>
      <div className={styles.grid}>{articles.map((article) => <NewsCard key={article.id} article={article} />)}</div>
      {articles.length === 0 && <div className={styles.empty}>{text.noResults}</div>}
    </div>
  )
}
