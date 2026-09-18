import { memo } from 'react'

import type { NewsArticle } from '@/types/dashboard'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import styles from './NewsCard.module.css'

interface NewsCardProps { article: NewsArticle }

export const NewsCard = memo(function NewsCard({ article }: NewsCardProps) {
  const { language } = useLanguage()
  const text = uiText[language].news
  const published = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(article.publishedAt))
  const href = safeNewsUrl(article.url)
  return (
    <article className={styles.article}>
      {article.thumbnailTone && <div className={styles.thumbnail} data-tone={article.thumbnailTone}><span>{article.category.slice(0, 2).toUpperCase()}</span></div>}
      <div className={styles.content}>
        <span className={styles.category}>{text.categories[article.category]} · {article.isMock ? text.demo : article.importance}</span>
        <h2>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{article.title}</a> : article.title}</h2>
        <p className={styles.summary}>{article.summary}</p>
        <footer><strong>{article.source}</strong><time dateTime={article.publishedAt}>{published}</time></footer>
      </div>
    </article>
  )
})
