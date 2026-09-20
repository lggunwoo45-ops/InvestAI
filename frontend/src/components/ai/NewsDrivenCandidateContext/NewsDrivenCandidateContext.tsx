import { NewsInsightPanel } from '@/components/news/NewsInsightPanel/NewsInsightPanel'
import type { Language } from '@/i18n/translations'
import type { NewsInsightSummary } from '@/types/newsInsight'
import styles from './NewsDrivenCandidateContext.module.css'

interface NewsDrivenCandidateContextProps { insights: readonly NewsInsightSummary[]; language: Language }

export function NewsDrivenCandidateContext({ insights, language }: NewsDrivenCandidateContextProps) {
  const visible = insights.slice(0, 3)
  if (!visible.length) return null
  return <section className={styles.section} aria-label={language === 'ko' ? '뉴스 기반 후보 맥락' : 'News-driven candidate context'}>
    <header><div><span>{language === 'ko' ? '뉴스 연결' : 'NEWS CONNECTION'}</span><h2>{language === 'ko' ? '뉴스 기반 후보 맥락' : 'News-driven candidate context'}</h2></div><p>{language === 'ko' ? '규칙 기반 제안 · 실제 AI 비활성 · 거시 뉴스는 시장 수준 맥락' : 'Rule-based suggestions · real AI inactive · macro news remains market-level context'}</p></header>
    <div className={styles.grid}>{visible.map((insight) => <NewsInsightPanel key={`${insight.source}:${insight.publishedAt}:${insight.originalTitle}`} insight={insight} language={language} compact />)}</div>
  </section>
}

