import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { newsService, type NewsLoadResult, type NewsProviderMode } from '@/services/news/newsService'
import { NewsProviderModeContext } from './newsProviderModeContext'
import { newsProviderModeStorageKey, readNewsProviderMode } from './newsProviderModeStorage'

/** RSS remains explicitly opt-in, including when saved storage is malformed. */
export function NewsProviderModeProvider({ children }: PropsWithChildren) {
  const [mode, updateMode] = useState<NewsProviderMode>(readNewsProviderMode)
  const [result, setResult] = useState<NewsLoadResult | null>(null)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    newsService.loadNews(mode, { signal: controller.signal }).then((next) => { if (active) setResult(next) })
    return () => { active = false; controller.abort() }
  }, [mode])
  const setMode = useCallback((next: NewsProviderMode) => {
    updateMode(next)
    try { window.localStorage.setItem(newsProviderModeStorageKey, next) } catch { /* Storage failure must not break news. */ }
  }, [])
  const currentResult = result?.requestedMode === mode ? result : null
  const value = useMemo(() => ({ mode, result: currentResult, setMode }), [currentResult, mode, setMode])
  return <NewsProviderModeContext value={value}>{children}</NewsProviderModeContext>
}
