import { useEffect } from 'react'

export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} · InvestAI`
  }, [pageTitle])
}
