import { describe, expect, it } from 'vitest'

import { newsArticles } from '@/services/dashboard/mockDashboardData'
import { marketDataService } from '@/services/market/marketDataService'
import { newsProvider } from './MockNewsProvider'
import { filterNews, newsForInstrument } from './newsSelectors'

describe('news selectors', () => {
  it('keeps mock provenance and resolves only explicitly mapped instrument links', async () => {
    expect(newsProvider.type).toBe('mock')
    expect(await newsProvider.loadNews()).toBe(newsArticles)
    for (const article of newsArticles) {
      expect(article.isMock).toBe(true)
      for (const [symbol, id] of Object.entries(article.relatedInstrumentIds ?? {})) {
        expect(article.relatedSymbols).toContain(symbol)
        expect(marketDataService.getKnownInstruments([id]).has(id)).toBe(true)
      }
    }
  })
  it('filters category, market, sentiment and importance independently', () => {
    expect(filterNews(newsArticles, { category: 'korea-stock' }).map((item) => item.id)).toEqual(['news-korea-semiconductors'])
    expect(filterNews(newsArticles, { category: 'us-stock' }).map((item) => item.id)).toEqual(['news-us-market'])
    expect(filterNews(newsArticles, { category: 'regulation' }).map((item) => item.id)).toEqual(['news-crypto-rules'])
    expect(filterNews(newsArticles, { market: 'korea' }).map((item) => item.id)).toEqual(['news-korea-semiconductors'])
    expect(filterNews(newsArticles, { sentiment: 'positive' }).map((item) => item.id)).toEqual(['news-eth-network', 'news-nvda-chips', 'news-sol-volume'])
    expect(filterNews(newsArticles, { importance: 'low' }).map((item) => item.id)).toEqual(['news-apple-devices', 'news-crypto-rules'])
  })

  it('combines all filters and returns a clear empty result when none match', () => {
    expect(filterNews(newsArticles, { query: 'rates', category: 'macro', market: 'macro', sentiment: 'negative', importance: 'high' }).map((item) => item.id)).toEqual(['news-fed-outlook'])
    expect(filterNews(newsArticles, { category: 'macro', market: 'korea' })).toEqual([])
  })

  it('updates instrument-related results with the active instrument', () => {
    const known = marketDataService.getKnownInstruments(['upbit-btc', 'us-nvda', 'krx-035420'])
    expect(newsForInstrument(newsArticles, known.get('upbit-btc')!).map((item) => item.id)).toContain('news-btc-etf')
    expect(newsForInstrument(newsArticles, known.get('us-nvda')!).map((item) => item.id)).toContain('news-nvda-chips')
    expect(newsForInstrument(newsArticles, known.get('krx-035420')!)).toEqual([])
  })
})
