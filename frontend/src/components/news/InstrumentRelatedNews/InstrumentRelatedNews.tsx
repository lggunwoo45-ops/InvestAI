import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { MarketInstrument } from '@/types/market'
import styles from './InstrumentRelatedNews.module.css'

interface InstrumentRelatedNewsProps { instrument: MarketInstrument }

export function InstrumentRelatedNews({ instrument }: InstrumentRelatedNewsProps) {
  const { result } = useNewsProviderMode()
  const { language } = useLanguage()
  const text = uiText[language].news
  const articles = useMemo(() => newsForInstrument(result?.articles ?? [], instrument).slice(0, 3), [result?.articles, instrument])
  const real = result?.source !== 'mock' && articles.some(article => !article.isMock)

  return <section className={styles.panel} aria-label={uiText[language].briefing.relatedNews}>
    <header><strong>{uiText[language].briefing.relatedNews}</strong><span>{real ? (language === 'ko' ? '실제 출처' : 'Original sources') : result?.source === 'mock' ? uiText[language].copilot.relatedDemoConsidered : ''}</span></header>
    {!result ? <p>{text.loading}</p> : articles.length ? <ul>{articles.map((article) =>
      <li key={article.id}><Link to="/news" state={{ query: article.title }}><span>{article.title}</span><small>{article.source}</small></Link></li>)}</ul>
      : <p>{text.noRelated}</p>}
    <small className={styles.boundary}>{result?.source === 'mock' ? uiText[language].copilot.demoNewsBoundary : (language === 'ko' ? '제목에 명시된 종목 연결이며 매수·매도 신호가 아닙니다.' : 'Explicit title matches, not buy or sell signals.')} {uiText[language].briefing.trust}</small>
  </section>
}
