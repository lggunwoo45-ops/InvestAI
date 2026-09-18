import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { LanguageContext } from './languageContext'
import type { Language } from './translations'

const storageKey = 'market-copilot.language'

function readLanguage(): Language {
  try { return window.localStorage.getItem(storageKey) === 'ko' ? 'ko' : 'en' }
  catch { return 'en' }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, updateLanguage] = useState<Language>(readLanguage)
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next)
    try { window.localStorage.setItem(storageKey, next) } catch { /* Private or blocked storage must not break the UI. */ }
  }, [])
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <LanguageContext value={value}>{children}</LanguageContext>
}
