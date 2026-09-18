import { discoverAssets, marketPulseItems } from '@/services/dashboard/mockDashboardData'
import { newsProvider } from '@/services/news/MockNewsProvider'
import { filterNews, type NewsFilters } from '@/services/news/newsSelectors'
import type { DiscoverAsset, DiscoverSectionId, MarketPulseItem, NewsArticle } from '@/types/dashboard'

export interface DashboardSnapshot {
  marketPulse: readonly MarketPulseItem[]
  discover: Record<DiscoverSectionId, readonly DiscoverAsset[]>
  news: readonly NewsArticle[]
}

/** Future APIs replace this service implementation without changing dashboard UI components. */
export class DashboardService {
  async getSnapshot(): Promise<DashboardSnapshot> {
    return {
      marketPulse: marketPulseItems,
      discover: {
        trending: discoverAssets.slice(0, 5),
        gainers: [...discoverAssets].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
        losers: [...discoverAssets].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
        volume: [...discoverAssets].sort((a, b) => b.volume - a.volume).slice(0, 5),
      },
      news: await newsProvider.loadNews(),
    }
  }

  async searchNews(filters: NewsFilters): Promise<readonly NewsArticle[]> {
    return filterNews(await newsProvider.loadNews(), filters)
  }
}

export const dashboardService = new DashboardService()
