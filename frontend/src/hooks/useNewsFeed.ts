import { useEffect, useState } from 'react'

import { newsService, type NewsLoadResult, type NewsProviderMode } from '@/services/news/newsService'

export function useNewsFeed(mode: NewsProviderMode): NewsLoadResult | null {
  const [result, setResult] = useState<NewsLoadResult | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    newsService.loadNews(mode, { signal: controller.signal }).then((next) => { if (active) setResult(next) })
    return () => { active = false; controller.abort() }
  }, [mode])

  return result?.requestedMode === mode ? result : null
}
