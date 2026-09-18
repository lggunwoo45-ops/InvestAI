import { newsArticles } from '@/services/dashboard/mockDashboardData'
import type { NewsProvider } from './NewsProvider'

export class MockNewsProvider implements NewsProvider {
  readonly id = 'investai-demo-news'
  readonly label = 'InvestAI Demo Desk'
  readonly type = 'mock' as const

  loadNews() { return Promise.resolve(newsArticles) }
}

export const newsProvider: NewsProvider = new MockNewsProvider()
