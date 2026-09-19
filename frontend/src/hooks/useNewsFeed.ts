import type { NewsLoadResult, NewsProviderMode } from '@/services/news/newsService'
import { useNewsProviderMode } from './useNewsProviderMode'

export function useNewsFeed(mode: NewsProviderMode): NewsLoadResult | null {
  const { result } = useNewsProviderMode()
  return result?.requestedMode === mode ? result : null
}
