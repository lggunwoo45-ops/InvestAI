import { createContext } from 'react'

import type { NewsProviderMode } from '@/services/news/newsService'

export interface NewsProviderModeValue {
  mode: NewsProviderMode
  setMode: (mode: NewsProviderMode) => void
}

export const NewsProviderModeContext = createContext<NewsProviderModeValue | null>(null)
