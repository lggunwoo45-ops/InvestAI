import { memo } from 'react'

import type { NewsArticle } from '@/types/dashboard'
import styles from './NewsCard.module.css'

interface NewsCardProps { article: NewsArticle }

export const NewsCard = memo(function NewsCard({ article }: NewsCardProps) {
  const published = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(article.publishedAt))
  return (
    <article className={styles.article}>
      {article.thumbnailTone && <div className={styles.thumbnail} data-tone={article.thumbnailTone}><span>{article.category.slice(0, 2).toUpperCase()}</span></div>}
      <div className={styles.content}><span className={styles.category}>{article.category}</span><h2>{article.title}</h2><footer><strong>{article.source}</strong><time dateTime={article.publishedAt}>{published}</time></footer></div>
    </article>
  )
})
