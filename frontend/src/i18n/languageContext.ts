import { createContext } from 'react'

import type { Language } from './translations'

export interface LanguageValue {
  language: Language
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageValue | null>(null)
