import type { NewsProviderMode } from '@/services/news/newsService'
import { runtimeConfig } from '@/config/runtimeConfig'

export const newsProviderModeStorageKey = 'market-copilot.newsProviderMode'

export function readNewsProviderMode(): NewsProviderMode {
  const defaultMode = runtimeConfig.isProductionLike ? 'live' : 'mock'
  try {
    const stored = window.localStorage.getItem(newsProviderModeStorageKey)
    return stored === 'rss-ready' || stored === 'local-proxy' || stored === 'mock' || stored === 'live' ? stored : defaultMode
  }
  catch { return defaultMode }
}
