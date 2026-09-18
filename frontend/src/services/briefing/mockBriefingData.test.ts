import { describe, expect, it } from 'vitest'

import { mockBriefings } from './mockBriefingData'
import { newsArticles } from '@/services/dashboard/mockDashboardData'
import { marketDataService } from '@/services/market/marketDataService'

describe('market briefing fixtures', () => {
  it('covers four markets and resolves every interactive instrument and news reference', () => {
    expect(mockBriefings.map((item) => item.id)).toEqual(['crypto', 'korea', 'us', 'macro'])
    const newsIds = new Set(newsArticles.map((article) => article.id))
    for (const briefing of mockBriefings) {
      expect(briefing.source).toBe('mock')
      expect(briefing.whatToWatch.length).toBeGreaterThan(0)
      for (const id of briefing.newsIds) expect(newsIds.has(id)).toBe(true)
      const references = [...briefing.majorMovers, ...briefing.topGainers, ...briefing.topLosers, ...briefing.highVolume]
      for (const reference of references) {
        if (reference.instrumentId) expect(marketDataService.getKnownInstruments([reference.instrumentId]).has(reference.instrumentId)).toBe(true)
      }
    }
  })

  it('labels every news fixture as mock and supplies the structured news metadata', () => {
    for (const article of newsArticles) {
      expect(article.isMock).toBe(true)
      expect(article.relatedMarkets.length).toBeGreaterThan(0)
      expect(['positive', 'neutral', 'negative']).toContain(article.sentiment)
      expect(['low', 'medium', 'high']).toContain(article.importance)
      expect(article.summary.length).toBeGreaterThan(0)
      expect(article.url).toBeUndefined()
    }
  })
})
