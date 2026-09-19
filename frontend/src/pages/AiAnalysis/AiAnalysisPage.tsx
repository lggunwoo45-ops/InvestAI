import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CryptoWatchCandidates } from '@/components/ai/CryptoWatchCandidates/CryptoWatchCandidates'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketCatalog } from '@/hooks/useMarketCatalog'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { useLanguage } from '@/i18n/useLanguage'
import { buildCryptoWatchCandidates } from '@/services/ai/cryptoWatchCandidateEngine'

export function AiAnalysisPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { marketDataMode, setMarketDataMode } = useMarketWorkspace()
  const { result: newsResult } = useNewsProviderMode()
  const { openInstrument } = useOpenNewsInstrument()
  const [retry, setRetry] = useState(0)
  const catalog = useMarketCatalog('upbit-krw', marketDataMode, retry)
  useDocumentTitle(language === 'ko' ? '가상자산 관찰 후보' : 'Crypto Watch Candidates')
  const candidates = useMemo(() => buildCryptoWatchCandidates({ instruments: catalog.catalog?.instruments ?? [], newsResult, language }), [catalog.catalog, language, newsResult])
  const retryCatalog = useCallback(() => setRetry((value) => value + 1), [])

  return <CryptoWatchCandidates candidates={candidates} language={language} mode={marketDataMode} loading={catalog.loading} error={catalog.error}
    onOpenInstrument={openInstrument} onOpenMarket={() => navigate('/market')} onModeChange={setMarketDataMode} onRetry={retryCatalog} />
}
