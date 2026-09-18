import { useContext } from 'react'

import { NewsProviderModeContext } from '@/store/newsProviderModeContext'

export function useNewsProviderMode() {
  const value = useContext(NewsProviderModeContext)
  if (!value) throw new Error('NewsProviderModeProvider is missing')
  return value
}
