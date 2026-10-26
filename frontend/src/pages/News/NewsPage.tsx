import { SimpleWorkspace } from '@/components/simple/SimpleWorkspace'
import simpleStyles from '@/components/simple/SimpleWorkspace.module.css'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

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
  const [simpleLimit, setSimpleLimit] = useState(6)
  const liveSubtitle = language === 'ko' ? '실제 발행된 뉴스의 제목·출처·시각을 확인하고 종목 분석으로 이어갑니다.' : 'Read published headlines, sources and dates, then open related instrument analysis.'
  useDocumentTitle(text.title)
  const location = useLocation()
  const routeState = location.state as NewsRouteState | null
  const { mode: providerMode, setMode: setProviderMode } = useNewsProviderMode()
  const feed = useNewsFeed(providerMode)
  const { selectedInstrument } = useMarketWorkspace()
  // Route-keyed state makes a new explicit news link visible without an effect or stale filters.
  const initial: NewsPageState = { routeKey: location.key, category: 'all', query: routeState?.query ?? '', market: routeState?.market ?? 'all', sentiment: 'all', importance: 'all', symbolFilter: !routeState?.query && !routeState?.market }
  const [savedFilters, setSavedFilters] = useState<NewsPageState>(initial)
  const filters = savedFilters.routeKey === location.key ? savedFilters : initial
  const { category, query, market, sentiment, importance, symbolFilter } = filters
  const updateFilters = (next: Partial<NewsPageState>) => setSavedFilters({ ...filters, ...next })
  const articles = useMemo(() => filterNews(feed?.articles ?? [], { query, category, market, sentiment, importance, symbol: symbolFilter ? selectedInstrument?.symbol : null }), [feed?.articles, query, category, market, sentiment, importance, selectedInstrument?.symbol, symbolFilter])
  const insightInstruments = useMemo(() => {
    const ids = new Set(['upbit-btc', 'upbit-eth'])
    for (const article of feed?.articles ?? []) for (const id of Object.values(article.relatedInstrumentIds ?? {})) ids.add(id)
    if (selectedInstrument) ids.add(selectedInstrument.id)
    return [...marketDataService.getKnownInstruments([...ids]).values()]
  }, [feed?.articles, selectedInstrument])
  const activeFilters: ActiveNewsFilter[] = []
  if (query.trim()) activeFilters.push({ id: 'query', label: text.filterLabels.search, value: query.trim(), onRemove: () => updateFilters({ query: '' }) })
  if (category !== 'all') activeFilters.push({ id: 'category', label: text.filterLabels.topic, value: text.categories[category], onRemove: () => updateFilters({ category: 'all' }) })
  if (market !== 'all') activeFilters.push({ id: 'market', label: text.marketFilter, value: market === 'macro' ? text.categories.macro : uiText[language].sessions[market], onRemove: () => updateFilters({ market: 'all' }) })
  if (sentiment !== 'all') activeFilters.push({ id: 'sentiment', label: text.sentiment, value: text.sentiments[sentiment], onRemove: () => updateFilters({ sentiment: 'all' }) })
  if (importance !== 'all') activeFilters.push({ id: 'importance', label: text.importance, value: text.importanceLevels[importance], onRemove: () => updateFilters({ importance: 'all' }) })
  if (symbolFilter && selectedInstrument) activeFilters.push({ id: 'symbol', label: text.filterLabels.symbol, value: selectedInstrument.symbol, onRemove: () => updateFilters({ symbolFilter: false }) })
  const clearFilters = () => updateFilters({ category: 'all', query: '', market: 'all', sentiment: 'all', importance: 'all', symbolFilter: false })

  if (displayMode === 'simple') {
    const simpleArticles = filterNews(feed?.articles ?? [], { query, market, category: 'all', sentiment: 'all', importance: 'all', symbol: symbolFilter ? selectedInstrument?.symbol : null }).filter(article => providerMode === 'mock' || !article.isMock)
    return <SimpleWorkspace title={ko ? '시장을 이해할 뉴스' : 'News to understand the market'} description={ko ? '기사 제목과 출처부터 읽어보세요. 뉴스 한 건으로 매수·매도를 결정하지 않아요.' : 'Start with the headline and source. A headline alone is not a trade signal.'}>
      <div className={simpleStyles.controls}><label>{ko ? '궁금한 내용' : 'Search news'}<input type="search" value={query} onChange={event => { updateFilters({ query: event.target.value }); setSimpleLimit(6) }} /></label><label>{ko ? '어느 시장인가요?' : 'Which market?'}<select value={market} onChange={event => { updateFilters({ market: event.target.value as NewsMarket | 'all' }); setSimpleLimit(6) }}><option value="all">{text.allMarkets}</option>{markets.map(item => <option key={item} value={item}>{item === 'macro' ? text.categories.macro : uiText[language].sessions[item]}</option>)}</select></label>
        {selectedInstrument && <button type="button" aria-pressed={symbolFilter} onClick={() => { updateFilters({ symbolFilter: !symbolFilter }); setSimpleLimit(6) }}>{selectedInstrument.symbol} {ko ? '관련만' : 'related only'}</button>}
      </div>
      {providerMode === 'mock' && <p role="status">{ko ? '예시 뉴스입니다. 실제 발행 기사와 다릅니다.' : 'Example news, not published articles.'}</p>}
      <div className={simpleStyles.list}>{simpleArticles.slice(0, simpleLimit).map(article => <article className={simpleStyles.card} key={article.id}><small>{article.source} · {new Date(article.publishedAt).toLocaleString(language)}</small><h2>{safeNewsUrl(article.url) ? <a href={safeNewsUrl(article.url)!} target="_blank" rel="noreferrer">{article.title} ↗</a> : article.title}</h2>{article.summary && <p>{article.summary}</p>}
        <footer>{Object.entries(article.relatedInstrumentIds ?? {}).slice(0, 3).map(([symbol, id]) => <Link key={id} to={`/my-analysis?instrumentId=${encodeURIComponent(id)}`}>{symbol} {ko ? '분석' : 'analysis'} →</Link>)}</footer>
      </article>)}</div>
      {!feed ? <p role="status">{text.loading}</p> : simpleArticles.length === 0 && <p role="status">{text.noResults}</p>}
      {simpleLimit < simpleArticles.length && <button type="button" onClick={() => setSimpleLimit(value => value + 6)}>{ko ? '뉴스 더 보기' : 'More news'}</button>}
      <details><summary>{ko ? '뉴스 연결 상태' : 'News connection'}</summary><NewsProviderStatus mode={providerMode} result={feed} onModeChange={setProviderMode} /></details>
    </SimpleWorkspace>
  }
  return (
    <div className={styles.page} data-display-mode={displayMode}>
      <header className={styles.heading}><div><span>MARKET INTELLIGENCE</span><h1>{text.title}</h1><p>{providerMode === 'live' ? liveSubtitle : text.subtitle}</p>{feed?.source === 'mock' && <strong className={styles.demo}>{text.demo}</strong>}{feed?.source === 'rss' && <strong className={styles.demo}>{text.provider.realRss}</strong>}{feed?.source === 'local-proxy' && <strong className={styles.demo}>{text.provider.localProxyRealRss}</strong>}</div><div className={styles.context}><span>{text.relatedMarket}</span><button type="button" disabled={!selectedInstrument} aria-pressed={symbolFilter} onClick={() => updateFilters({ symbolFilter: !symbolFilter })}>{selectedInstrument ? `${selectedInstrument.symbol} ${symbolFilter ? text.on : text.off}` : text.noSymbol}</button></div></header>
      <NewsProviderStatus mode={providerMode} result={feed} onModeChange={setProviderMode} />
      <div className={styles.controls}>
        <div className={styles.search}><span>{text.filterLabels.search}</span><label><Icon name="search" size={14} /><input type="search" value={query} onChange={(event) => updateFilters({ query: event.target.value })} placeholder={text.search} aria-label="Search news" /></label></div>
        <div className={styles.topics}><span>{text.filterLabels.topic}</span><div role="tablist" aria-label="News categories"><button type="button" role="tab" aria-selected={category === 'all'} onClick={() => updateFilters({ category: 'all' })}>{text.all}</button>{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => updateFilters({ category: item })}>{text.categories[item]}</button>)}</div></div>
      </div>
      <div className={styles.filterRow} aria-label={text.filters}>
        <label>{text.marketFilter}<select aria-label={text.marketFilter} value={market} onChange={(event) => updateFilters({ market: event.target.value as NewsMarket | 'all' })}>
          <option value="all">{text.allMarkets}</option>{markets.map((item) => <option key={item} value={item}>{item === 'macro' ? text.categories.macro : uiText[language].sessions[item]}</option>)}
        </select></label>
        <label>{text.sentiment}<select aria-label={text.sentiment} value={sentiment} onChange={(event) => updateFilters({ sentiment: event.target.value as NewsSentiment | 'all' })}>
          <option value="all">{text.allSentiments}</option>{sentiments.map((item) => <option key={item} value={item}>{text.sentiments[item]}</option>)}
        </select></label>
        <label>{text.importance}<select aria-label={text.importance} value={importance} onChange={(event) => updateFilters({ importance: event.target.value as NewsImportance | 'all' })}>
          <option value="all">{text.allImportance}</option>{importanceLevels.map((item) => <option key={item} value={item}>{text.importanceLevels[item]}</option>)}
        </select></label>
      </div>
      <NewsFilterSummary filters={activeFilters} title={text.activeFilters} clearAllLabel={text.clearAll} removeLabel={text.removeFilter} onClearAll={clearFilters} />
      <p className={styles.trust}>{uiText[language].briefing.trust} {uiText[language].briefing.finalDecision}</p>
      <div className={styles.resultBar} aria-live="polite"><span>{articles.length} {text.articles}</span><strong>{selectedInstrument && symbolFilter ? `${text.filteredFor} ${selectedInstrument.symbol}` : market !== 'all' ? `${text.filteredFor} ${market === 'macro' ? text.categories.macro : uiText[language].sessions[market]}` : text.allCoverage}</strong></div>
      <div className={styles.grid}>{articles.map((article) => <NewsCard key={article.id} article={article} availableInstruments={insightInstruments} />)}</div>
      {!feed ? <div className={styles.empty}>{text.loading}</div> : articles.length === 0 && <div className={styles.empty}>{text.noResults}</div>}
    </div>
  )
}
