import { createContext } from 'react'

import type { NewsLoadResult, NewsProviderMode } from '@/services/news/newsService'

export interface NewsProviderModeValue {
  mode: NewsProviderMode
  result: NewsLoadResult | null
  setMode: (mode: NewsProviderMode) => void
}

export const NewsProviderModeContext = createContext<NewsProviderModeValue | null>(null)
