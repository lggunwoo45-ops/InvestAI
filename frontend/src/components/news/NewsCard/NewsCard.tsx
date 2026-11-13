import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { NewsInsightPanel } from '@/components/news/NewsInsightPanel/NewsInsightPanel'
import { useOpenNewsInstrument } from '@/hooks/useOpenNewsInstrument'
import { buildNewsInsight } from '@/services/news/newsInsightEngine'
import type { NewsArticle } from '@/types/dashboard'
import type { NewsInsightAvailableInstrument } from '@/types/newsInsight'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import styles from './NewsCard.module.css'

interface NewsCardProps { article: NewsArticle; availableInstruments?: readonly NewsInsightAvailableInstrument[]; simple?: boolean }

export const NewsCard = memo(function NewsCard({ article, availableInstruments = [], simple = false }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [insightOpen, setInsightOpen] = useState(false)
  const { openInstrument, canOpenInstrument } = useOpenNewsInstrument()
  const { language } = useLanguage()
  const text = uiText[language].news
  const published = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(article.publishedAt))
  const href = safeNewsUrl(article.url)
  const insight = useMemo(() => buildNewsInsight({ article, availableInstruments, language }), [article, availableInstruments, language])
  return (
    <article className={styles.article} data-has-thumbnail={Boolean(article.thumbnailTone)}>
      <div className={styles.content}>
        <div className={styles.meta}><strong>{article.source}</strong><span className={styles.category}>{text.categories[article.category]}</span><time dateTime={article.publishedAt}>{published} KST</time>{article.isMock && <span className={styles.demo}>{text.demo}</span>}</div>
        <h2>{!article.isMock && href ? <a href={href} target="_blank" rel="noopener noreferrer">{article.title}</a> : article.title}</h2>
        {article.summary && <p className={styles.summary}>{article.summary}</p>}
        <footer className={styles.actions}>
        {article.relatedSymbols.length > 0 && <div className={styles.symbols} aria-label={text.relatedSymbols}>
          {article.relatedSymbols.map((symbol) => {
            const id = article.relatedInstrumentIds?.[symbol]
            return simple && id
              ? <Link key={symbol} to={`/my-analysis?instrumentId=${encodeURIComponent(id)}`}>{symbol} {language === 'ko' ? '분석' : 'analysis'} →</Link>
              : id && canOpenInstrument(id)
              ? <button key={symbol} type="button" onClick={() => openInstrument(id)} aria-label={`${text.openInMarket}: ${symbol}`} title={text.viewSymbol}>{symbol} ↗</button>
              : !article.isMock && ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'LINK', 'AVAX', 'DOT'].includes(symbol)
                ? <Link key={symbol} to={`/my-analysis?instrumentId=upbit-${symbol.toLowerCase()}`} aria-label={`${symbol} ${language === 'ko' ? '종목 분석' : 'analysis'}`}>{symbol} ↗</Link>
                : <span key={symbol}>{symbol}</span>
          })}
        </div>}
        <div className={styles.links}>
          {!article.isMock && href && <a href={href} target="_blank" rel="noopener noreferrer">{text.externalSource} ↗</a>}
          {!simple && <button className={styles.detailsToggle} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? text.hideDetails : text.details}</button>}
          {!simple && <button className={styles.insightToggle} type="button" aria-expanded={insightOpen} onClick={() => setInsightOpen((value) => !value)}>{language === 'ko' ? insightOpen ? '인사이트 닫기' : '인사이트 보기' : insightOpen ? 'Hide insight' : 'View insight'}</button>}
        </div>
        </footer>
        {!simple && expanded && <div className={styles.details}>
          <dl>
            <div><dt>{text.provider.source}</dt><dd>{article.source}</dd></div>
            <div><dt>{text.provider.publishedTime}</dt><dd>{published}</dd></div>
            <div><dt>{text.sentiment}</dt><dd>{text.sentiments[article.sentiment]}</dd></div>
            <div><dt>{text.importance}</dt><dd>{text.importanceLevels[article.importance]}</dd></div>
            <div><dt>{text.relatedMarkets}</dt><dd>{article.relatedMarkets.map((market) => market === 'macro' ? text.categories.macro : uiText[language].sessions[market]).join(' · ')}</dd></div>
          </dl>
          {article.summary && <p>{text.summary}: {article.summary}</p>}
          <p>{article.isMock && `${text.demo} · `}{uiText[language].briefing.trust} {uiText[language].briefing.finalDecision}</p>
          {article.isMock && href && <a href={href} target="_blank" rel="noopener noreferrer">{text.externalSource} ↗</a>}
        </div>}
        {!simple && insightOpen && <NewsInsightPanel insight={insight} language={language} />}
      </div>
    </article>
  )
})
