import type { NewsArticle, NewsCategory, NewsImportance, NewsMarket, NewsSentiment } from '@/types/dashboard'
import type { MarketInstrument } from '@/types/market'

export interface NewsFilters {
  query?: string
  category?: NewsCategory | 'all'
  market?: NewsMarket | 'all'
  sentiment?: NewsSentiment | 'all'
  importance?: NewsImportance | 'all'
  symbol?: string | null
}

function matchesSymbol(article: NewsArticle, symbol: string) {
  const exact = symbol.toLocaleUpperCase()
  const base = exact.split('/')[0].replace(/USDT$/, '')
  return article.relatedSymbols.some((related) => {
    const candidate = related.toLocaleUpperCase()
    return candidate === exact || candidate === base || candidate.split('/')[0] === base
  })
}

/** A pure selector keeps combined filtering independent from the eventual provider. */
export function filterNews(articles: readonly NewsArticle[], filters: NewsFilters): readonly NewsArticle[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? ''
  return articles.filter((article) =>
    (!query || `${article.title} ${article.source} ${article.summary} ${article.relatedSymbols.join(' ')}`.toLocaleLowerCase().includes(query))
    && (!filters.category || filters.category === 'all' || article.category === filters.category)
    && (!filters.market || filters.market === 'all' || article.relatedMarkets.includes(filters.market))
    && (!filters.sentiment || filters.sentiment === 'all' || article.sentiment === filters.sentiment)
    && (!filters.importance || filters.importance === 'all' || article.importance === filters.importance)
    && (!filters.symbol || matchesSymbol(article, filters.symbol)),
  )
}

export function newsForInstrument(articles: readonly NewsArticle[], instrument: MarketInstrument): readonly NewsArticle[] {
  return articles.filter((article) =>
    Object.values(article.relatedInstrumentIds ?? {}).includes(instrument.id) || matchesSymbol(article, instrument.symbol),
  )
}
