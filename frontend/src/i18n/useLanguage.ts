import { useContext } from 'react'

import { LanguageContext } from './languageContext'

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('LanguageProvider is missing')
  return value
}
