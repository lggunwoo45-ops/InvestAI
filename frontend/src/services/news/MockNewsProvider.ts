import { newsArticles } from '@/services/dashboard/mockDashboardData'
import type { NewsProvider } from './NewsProvider'

export class MockNewsProvider implements NewsProvider {
  readonly source = 'mock' as const

  loadNews() { return Promise.resolve(newsArticles) }
}

export const newsProvider: NewsProvider = new MockNewsProvider()
