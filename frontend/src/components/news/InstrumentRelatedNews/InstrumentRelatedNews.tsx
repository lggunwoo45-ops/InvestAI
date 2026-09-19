import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useDashboardData } from '@/hooks/useDashboardData'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { MarketInstrument } from '@/types/market'
import styles from './InstrumentRelatedNews.module.css'

interface InstrumentRelatedNewsProps { instrument: MarketInstrument }

export function InstrumentRelatedNews({ instrument }: InstrumentRelatedNewsProps) {
  const dashboard = useDashboardData()
  const { language } = useLanguage()
  const text = uiText[language].news
  const articles = useMemo(() => newsForInstrument(dashboard?.news ?? [], instrument).slice(0, 3), [dashboard?.news, instrument])

  return <section className={styles.panel} aria-label={uiText[language].briefing.relatedNews}>
    <header><strong>{uiText[language].briefing.relatedNews}</strong><span>{uiText[language].copilot.relatedDemoConsidered}</span></header>
    {!dashboard ? <p>{text.loading}</p> : articles.length ? <ul>{articles.map((article) =>
      <li key={article.id}><Link to="/news" state={{ query: article.title }}><span>{article.title}</span><small>{article.source}</small></Link></li>)}</ul>
      : <p>{text.noRelated}</p>}
    <small className={styles.boundary}>{text.analysisInactive} {uiText[language].briefing.trust}</small>
  </section>
}
