import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Icon } from '@/components/Icon/Icon'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { NewsCard } from '@/components/news/NewsCard/NewsCard'
import { NewsFilterSummary, type ActiveNewsFilter } from '@/components/news/NewsFilterSummary/NewsFilterSummary'
import { NewsProviderStatus } from '@/components/news/NewsProviderStatus/NewsProviderStatus'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { filterNews } from '@/services/news/newsSelectors'
import { marketDataService } from '@/services/market/marketDataService'
import type { NewsCategory, NewsImportance, NewsMarket, NewsSentiment } from '@/types/dashboard'
import styles from './NewsPage.module.css'

const categories: readonly NewsCategory[] = ['crypto', 'korea-stock', 'us-stock', 'macro', 'technology', 'ai', 'earnings', 'regulation']
const markets: readonly NewsMarket[] = ['crypto', 'korea', 'us', 'macro']
const sentiments: readonly NewsSentiment[] = ['positive', 'neutral', 'negative', 'unassessed']
const importanceLevels: readonly NewsImportance[] = ['high', 'medium', 'low', 'unassessed']
interface NewsRouteState { query?: string; market?: NewsMarket }
interface NewsPageState {
  routeKey: string
  category: NewsCategory | 'all'
  query: string
  market: NewsMarket | 'all'
  sentiment: NewsSentiment | 'all'
  importance: NewsImportance | 'all'
  symbolFilter: boolean
}

export function NewsPage() {
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const text = uiText[language].news
  const ko = language === 'ko'
  const [visibleLimit, setVisibleLimit] = useState(12)
  const simple = displayMode === 'simple'
  const liveSubtitle = language === 'ko' ? '실제 발행된 뉴스의 제목·출처·시각을 확인하고 종목 분석으로 이어갑니다.' : 'Read published headlines, sources and dates, then open related instrument analysis.'
  useDocumentTitle(text.title)
  const location = useLocation()
  const routeState = location.state as NewsRouteState | null
  const { mode: providerMode, setMode: setProviderMode, refresh } = useNewsProviderMode()
  const feed = useNewsFeed(providerMode)
  const { selectedInstrument } = useMarketWorkspace()
  // Route-keyed state makes a new explicit news link visible without an effect or stale filters.
  const initial: NewsPageState = { routeKey: location.key, category: 'all', query: routeState?.query ?? '', market: routeState?.market ?? 'all', sentiment: 'all', importance: 'all', symbolFilter: !routeState?.query && !routeState?.market }
  const [savedFilters, setSavedFilters] = useState<NewsPageState>(initial)
  const filters = savedFilters.routeKey === location.key ? savedFilters : initial
  const { category, query, market, sentiment, importance, symbolFilter } = filters
  const updateFilters = (next: Partial<NewsPageState>) => { setSavedFilters({ ...filters, ...next }); setVisibleLimit(12) }
  const articles = useMemo(() => filterNews(feed?.articles ?? [], { query, category: simple ? 'all' : category, market, sentiment: simple ? 'all' : sentiment, importance: simple ? 'all' : importance, symbol: symbolFilter ? selectedInstrument?.symbol : null }).filter(article => !simple || providerMode === 'mock' || !article.isMock).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)), [feed?.articles, query, category, market, sentiment, importance, selectedInstrument?.symbol, symbolFilter, simple, providerMode])
  const insightInstruments = useMemo(() => {
    const ids = new Set(['upbit-btc', 'upbit-eth'])
    for (const article of feed?.articles ?? []) for (const id of Object.values(article.relatedInstrumentIds ?? {})) ids.add(id)
    if (selectedInstrument) ids.add(selectedInstrument.id)
    return [...marketDataService.getKnownInstruments([...ids]).values()]
  }, [feed?.articles, selectedInstrument])
  const activeFilters: ActiveNewsFilter[] = []
  if (query.trim()) activeFilters.push({ id: 'query', label: text.filterLabels.search, value: query.trim(), onRemove: () => updateFilters({ query: '' }) })
  if (!simple && category !== 'all') activeFilters.push({ id: 'category', label: text.filterLabels.topic, value: text.categories[category], onRemove: () => updateFilters({ category: 'all' }) })
  if (market !== 'all') activeFilters.push({ id: 'market', label: text.marketFilter, value: market === 'macro' ? text.categories.macro : uiText[language].sessions[market], onRemove: () => updateFilters({ market: 'all' }) })
  if (!simple && sentiment !== 'all') activeFilters.push({ id: 'sentiment', label: text.sentiment, value: text.sentiments[sentiment], onRemove: () => updateFilters({ sentiment: 'all' }) })
  if (!simple && importance !== 'all') activeFilters.push({ id: 'importance', label: text.importance, value: text.importanceLevels[importance], onRemove: () => updateFilters({ importance: 'all' }) })
  if (symbolFilter && selectedInstrument) activeFilters.push({ id: 'symbol', label: text.filterLabels.symbol, value: selectedInstrument.symbol, onRemove: () => updateFilters({ symbolFilter: false }) })
  const clearFilters = () => updateFilters({ category: 'all', query: '', market: 'all', sentiment: 'all', importance: 'all', symbolFilter: false })

  const hasFeedIssue = Boolean(feed?.error || feed?.sources?.some(source => source.state !== 'ready'))
  const isDemo = providerMode === 'mock' || feed?.source === 'mock'

  return (
    <div className={styles.page} data-display-mode={displayMode} data-simple-workspace={simple || undefined}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>MARKET COPILOT / NEWS</span><h1>{simple ? (ko ? '시장 뉴스' : 'News to understand the market') : text.title}</h1><p>{ko ? '시장의 변화를 읽고, 관심 종목으로 이어가세요.' : liveSubtitle}</p></div>
        <button className={styles.refresh} type="button" onClick={refresh}>{ko ? '새로고침' : 'Refresh news'} ↻</button>
      </header>
      <section className={styles.toolbar} aria-label={text.filters}>
        <div className={styles.controls}>
          <label className={styles.search}><Icon name="search" size={18} /><input type="search" value={query} onChange={event => updateFilters({ query: event.target.value })} placeholder={text.search} aria-label="Search news" /></label>
          <label className={styles.marketSelect}><span>{text.marketFilter}</span><select aria-label={text.marketFilter} value={market} onChange={event => updateFilters({ market: event.target.value as NewsMarket | 'all' })}>
            <option value="all">{text.allMarkets}</option>{markets.map(item => <option key={item} value={item}>{item === 'macro' ? text.categories.macro : uiText[language].sessions[item]}</option>)}
          </select></label>
          {selectedInstrument && <button className={styles.related} type="button" aria-pressed={symbolFilter} onClick={() => updateFilters({ symbolFilter: !symbolFilter })}>{selectedInstrument.symbol} {symbolFilter ? text.on : text.off}</button>}
        </div>
        {!simple && <details className={styles.advanced}>
          <summary>{ko ? '상세 필터' : 'More filters'}</summary>
          <div className={styles.topics} role="tablist" aria-label="News categories"><button type="button" role="tab" aria-selected={category === 'all'} onClick={() => updateFilters({ category: 'all' })}>{text.all}</button>{categories.map(item => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => updateFilters({ category: item })}>{text.categories[item]}</button>)}</div>
          <div className={styles.filterRow}>
            <label>{text.sentiment}<select aria-label={text.sentiment} value={sentiment} onChange={event => updateFilters({ sentiment: event.target.value as NewsSentiment | 'all' })}><option value="all">{text.allSentiments}</option>{sentiments.map(item => <option key={item} value={item}>{text.sentiments[item]}</option>)}</select></label>
            <label>{text.importance}<select aria-label={text.importance} value={importance} onChange={event => updateFilters({ importance: event.target.value as NewsImportance | 'all' })}><option value="all">{text.allImportance}</option>{importanceLevels.map(item => <option key={item} value={item}>{text.importanceLevels[item]}</option>)}</select></label>
          </div>
        </details>}
        <NewsFilterSummary filters={activeFilters} title={text.activeFilters} clearAllLabel={text.clearAll} removeLabel={text.removeFilter} onClearAll={clearFilters} />
      </section>
      {isDemo && <p className={styles.notice} role="status">{text.demo}</p>}
      {hasFeedIssue && <p className={styles.notice} role="status">{ko ? '일부 뉴스의 연결이 지연되거나 실패했습니다. 아래 수신 상태에서 출처별 시각을 확인하세요.' : 'Some feeds are delayed or unavailable. Check source times in the feed status below.'}</p>}
      <div className={styles.resultBar}>
        <h2>{ko ? '최신 기사' : 'Latest stories'} <span aria-live="polite">{articles.length} {text.articles}</span></h2>
        <span>{ko ? '발행 시각순' : 'Newest first'} · KST</span>
      </div>
      <div className={styles.grid}>{articles.slice(0, visibleLimit).map(article => <NewsCard key={article.id} article={article} availableInstruments={insightInstruments} simple={simple} />)}</div>
      {!feed ? <div className={styles.empty} role="status">{ko ? '뉴스를 불러오는 중…' : 'Loading news…'}</div> : articles.length === 0 && <div className={styles.empty} role="status">{text.noResults}</div>}
      {visibleLimit < articles.length && <button className={styles.more} type="button" onClick={() => setVisibleLimit(value => value + 12)}>{ko ? '뉴스 더 보기' : 'More news'} <span>{Math.min(visibleLimit, articles.length)} / {articles.length}</span></button>}
      <footer className={styles.pageFooter}>
        <p>{ko ? '기사 제목과 출처를 제공하며, 원문은 발행사에서 확인할 수 있습니다.' : 'Headlines are attributed to their publishers. Read the full story at the source.'}</p>
        <details className={styles.feedDetails}><summary>{ko ? '뉴스 출처 · 수신 상태' : 'Sources & feed status'}</summary><NewsProviderStatus mode={providerMode} result={feed} onModeChange={setProviderMode} /></details>
      </footer>
    </div>
  )
}
