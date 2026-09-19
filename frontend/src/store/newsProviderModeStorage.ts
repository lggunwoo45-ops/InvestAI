import type { NewsProviderMode } from '@/services/news/newsService'

export const newsProviderModeStorageKey = 'market-copilot.newsProviderMode'

export function readNewsProviderMode(): NewsProviderMode {
  try {
    const stored = window.localStorage.getItem(newsProviderModeStorageKey)
    return stored === 'rss-ready' || stored === 'local-proxy' ? stored : 'mock'
  }
  catch { return 'mock' }
}
