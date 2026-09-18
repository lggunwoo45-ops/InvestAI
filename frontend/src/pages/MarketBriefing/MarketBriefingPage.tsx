import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { BriefingCard } from '@/components/briefing/BriefingCard'
import { NewsProviderStatus } from '@/components/news/NewsProviderStatus/NewsProviderStatus'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { mockBriefings } from '@/services/briefing/mockBriefingData'
import { marketDataService } from '@/services/market/marketDataService'
import styles from './MarketBriefingPage.module.css'

const relatedIds = [...new Set(mockBriefings.flatMap((item) => [
  ...item.majorMovers, ...item.topGainers, ...item.topLosers, ...item.highVolume,
].map((reference) => reference.instrumentId).filter((id): id is string => Boolean(id))))]
const knownInstruments = marketDataService.getKnownInstruments(relatedIds)
const availableIds = new Set(knownInstruments.keys())

export function MarketBriefingPage() {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const dashboard = useDashboardData()
  const { mode: providerMode, setMode: setProviderMode } = useNewsProviderMode()
  const feed = useNewsFeed(providerMode)
  const { selectInstrument } = useMarketWorkspace()
  const { trackRecentlyViewed } = useWatchlists()
  const text = uiText[language].briefing
  useDocumentTitle(text.title)

  const openInstrument = useCallback((id: string) => {
    const instrument = knownInstruments.get(id)
    if (!instrument) return
    marketDataService.rememberInstrument(instrument)
    trackRecentlyViewed(instrument.id)
    selectInstrument(instrument)
    navigate('/market')
  }, [navigate, selectInstrument, trackRecentlyViewed])

  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><span>{text.eyebrow}</span><h1>{text.title}</h1><p>{text.subtitle}</p></div>
      <strong>{text.demo}</strong>
    </header>
    <NewsProviderStatus mode={providerMode} result={feed} onModeChange={setProviderMode} />
    <p className={styles.trust}>{text.trust} {text.finalDecision}</p>
    <div className={styles.grid}>{mockBriefings.map((briefing) => <BriefingCard
      key={briefing.id} briefing={briefing} language={language} availableIds={availableIds}
      news={feed?.source === 'rss'
        ? feed.articles.filter((article) => article.relatedMarkets.includes(briefing.id)).slice(0, 4)
        : providerMode === 'mock' || feed?.source === 'mock'
          ? briefing.newsIds.flatMap((id) => { const article = (feed?.articles ?? dashboard?.news)?.find((item) => item.id === id); return article ? [article] : [] })
          : []}
      newsSource={feed?.source ?? (providerMode === 'mock' && dashboard ? 'mock' : null)}
      onOpenInstrument={openInstrument}
    />)}</div>
  </main>
}
