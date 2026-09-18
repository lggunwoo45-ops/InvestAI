import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import type { NewsProviderMode } from '@/services/news/newsService'
import { NewsProviderModeContext } from './newsProviderModeContext'
import { newsProviderModeStorageKey, readNewsProviderMode } from './newsProviderModeStorage'

/** RSS remains explicitly opt-in, including when saved storage is malformed. */
export function NewsProviderModeProvider({ children }: PropsWithChildren) {
  const [mode, updateMode] = useState<NewsProviderMode>(readNewsProviderMode)
  const setMode = useCallback((next: NewsProviderMode) => {
    updateMode(next)
    try { window.localStorage.setItem(newsProviderModeStorageKey, next) } catch { /* Storage failure must not break news. */ }
  }, [])
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])
  return <NewsProviderModeContext value={value}>{children}</NewsProviderModeContext>
}
