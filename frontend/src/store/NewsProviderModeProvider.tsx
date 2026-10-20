import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { newsService, type NewsLoadResult, type NewsProviderMode } from '@/services/news/newsService'
import { NewsProviderModeContext } from './newsProviderModeContext'
import { newsProviderModeStorageKey, readNewsProviderMode } from './newsProviderModeStorage'

/** Shared feed for all pages. A refresh retains the previous source's original timestamp. */
export function NewsProviderModeProvider({ children }: PropsWithChildren) {
  const [mode, updateMode] = useState<NewsProviderMode>(readNewsProviderMode)
  const [result, setResult] = useState<NewsLoadResult | null>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (mode !== 'live') return
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = setInterval(refreshVisible, 300_000)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refreshVisible) }
  }, [mode, refresh])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    newsService.loadNews(mode, { signal: controller.signal }).then((next) => { if (active) setResult(next) })
    return () => { active = false; controller.abort() }
  }, [mode, revision])
  const setMode = useCallback((next: NewsProviderMode) => {
    updateMode(next)
    try { window.localStorage.setItem(newsProviderModeStorageKey, next) } catch { /* Storage failure must not break news. */ }
  }, [])
  const currentResult = result?.requestedMode === mode ? result : null
  const value = useMemo(() => ({ mode, result: currentResult, setMode, refresh }), [currentResult, mode, setMode, refresh])
  return <NewsProviderModeContext value={value}>{children}</NewsProviderModeContext>
}
