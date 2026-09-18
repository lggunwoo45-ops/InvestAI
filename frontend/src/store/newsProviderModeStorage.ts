import type { NewsProviderMode } from '@/services/news/newsService'

export const newsProviderModeStorageKey = 'market-copilot.newsProviderMode'

export function readNewsProviderMode(): NewsProviderMode {
  try { return window.localStorage.getItem(newsProviderModeStorageKey) === 'rss-ready' ? 'rss-ready' : 'mock' }
  catch { return 'mock' }
}
