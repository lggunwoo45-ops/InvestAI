import type { NewsArticle } from '@/types/dashboard'

/** Async boundary for a future licensed news source. Sprint 8.2 registers mock data only. */
export interface NewsProvider {
  readonly source: 'mock' | 'live'
  loadNews(): Promise<readonly NewsArticle[]>
}
