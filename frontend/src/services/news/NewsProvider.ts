import type { NewsArticle } from '@/types/dashboard'

export type NewsProviderType = 'mock' | 'rss' | 'public-api'
export interface NewsLoadOptions { signal?: AbortSignal }

/** Provider boundary; no UI component owns a feed URL or network request. */
export interface NewsProvider {
  readonly id: string
  readonly label: string
  readonly type: NewsProviderType
  loadNews(options?: NewsLoadOptions): Promise<readonly NewsArticle[]>
}
