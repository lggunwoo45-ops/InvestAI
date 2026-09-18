import { memo, useState } from 'react'

import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import type { NewsArticle } from '@/types/dashboard'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import styles from './NewsCard.module.css'

interface NewsCardProps { article: NewsArticle }

export const NewsCard = memo(function NewsCard({ article }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { openInstrument, canOpenInstrument } = useOpenNewsInstrument()
  const { language } = useLanguage()
  const text = uiText[language].news
  const published = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(article.publishedAt))
  const href = safeNewsUrl(article.url)
  return (
    <article className={styles.article}>
      {article.thumbnailTone && <div className={styles.thumbnail} data-tone={article.thumbnailTone}><span>{article.category.slice(0, 2).toUpperCase()}</span></div>}
      <div className={styles.content}>
        <span className={styles.category}>{text.categories[article.category]} · {article.isMock ? text.demo : text.importanceLevels[article.importance]}</span>
        <h2>{article.title}</h2>
        <p className={styles.summary}>{article.summary}</p>
        <footer><strong>{article.source}</strong><time dateTime={article.publishedAt}>{published}</time></footer>
        <div className={styles.symbols} aria-label={text.relatedSymbols}>
          {article.relatedSymbols.length === 0 && <span>{text.provider.relatedUnavailable}</span>}
          {article.relatedSymbols.map((symbol) => {
            const id = article.relatedInstrumentIds?.[symbol]
            return id && canOpenInstrument(id)
              ? <button key={symbol} type="button" onClick={() => openInstrument(id)} aria-label={`${text.openInMarket}: ${symbol}`} title={text.viewSymbol}>{symbol} ↗</button>
              : <span key={symbol}>{symbol}</span>
          })}
        </div>
        <button className={styles.detailsToggle} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? text.hideDetails : text.details}</button>
        {expanded && <div className={styles.details}>
          <dl>
            <div><dt>{text.provider.source}</dt><dd>{article.source}</dd></div>
            <div><dt>{text.provider.publishedTime}</dt><dd>{published}</dd></div>
            <div><dt>{text.sentiment}</dt><dd>{text.sentiments[article.sentiment]}</dd></div>
            <div><dt>{text.importance}</dt><dd>{text.importanceLevels[article.importance]}</dd></div>
            <div><dt>{text.relatedMarkets}</dt><dd>{article.relatedMarkets.map((market) => market === 'macro' ? text.categories.macro : uiText[language].sessions[market]).join(' · ')}</dd></div>
          </dl>
          <p>{text.summary}: {article.summary}</p>
          <p>{article.isMock && `${text.demo} · `}{uiText[language].briefing.trust} {uiText[language].briefing.finalDecision}</p>
          {href && <a href={href} target="_blank" rel="noopener noreferrer">{text.externalSource} ↗</a>}
        </div>}
      </div>
    </article>
  )
})
