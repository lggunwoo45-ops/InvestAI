import { discoverAssets, marketPulseItems, newsArticles } from '@/services/dashboard/mockDashboardData'
import type { DiscoverAsset, DiscoverSectionId, MarketPulseItem, NewsArticle, NewsCategory } from '@/types/dashboard'

export interface DashboardSnapshot {
  marketPulse: readonly MarketPulseItem[]
  discover: Record<DiscoverSectionId, readonly DiscoverAsset[]>
  news: readonly NewsArticle[]
}

export interface NewsQuery {
  query?: string
  category?: NewsCategory | 'all'
  symbol?: string | null
}

/** Future APIs replace this service implementation without changing dashboard UI components. */
export class DashboardService {
  async getSnapshot(): Promise<DashboardSnapshot> {
    return Promise.resolve({
      marketPulse: marketPulseItems,
      discover: {
        trending: discoverAssets.slice(0, 5),
        gainers: [...discoverAssets].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
        losers: [...discoverAssets].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
        volume: [...discoverAssets].sort((a, b) => b.volume - a.volume).slice(0, 5),
      },
      news: newsArticles,
    })
  }

  searchNews({ query = '', category = 'all', symbol = null }: NewsQuery): readonly NewsArticle[] {
    const normalized = query.trim().toLocaleLowerCase()
    const symbolKey = symbol?.split('/')[0].replace('USDT', '').toLocaleUpperCase() ?? null
    return newsArticles.filter((article) => {
      const categoryMatch = category === 'all' || article.category === category
      const queryMatch = !normalized || `${article.title} ${article.source} ${article.relatedSymbols.join(' ')}`.toLocaleLowerCase().includes(normalized)
      const symbolMatch = !symbolKey || article.relatedSymbols.some((related) => related.toLocaleUpperCase().includes(symbolKey))
      return categoryMatch && queryMatch && symbolMatch
    })
  }
}

export const dashboardService = new DashboardService()
