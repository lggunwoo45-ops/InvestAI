import type { Language } from '@/i18n/translations'
import type { NewsInsightSummary } from '@/types/newsInsight'
import styles from './NewsInsightPanel.module.css'

interface NewsInsightPanelProps { insight: NewsInsightSummary; language: Language; compact?: boolean }

const copy = {
  en: { title: 'News Insight', status: 'RULE-BASED · REAL AI DISCONNECTED', original: 'Original headline', issue: 'Key issue', impact: 'Market impact', candidates: 'Related watch candidates', none: 'No instrument-specific candidate', horizons: 'Review horizons', short: 'Short', swing: 'Swing', long: 'Long', risks: 'Risks & caveats', source: 'Open original source', demo: 'DEMO INSIGHT', actions: ['AI Korean Summary · Planned', 'AI Impact Analysis · Planned', 'Generate Candidate Report · Planned'], helper: 'Future paid AI feature. No payment or AI request is made.' },
  ko: { title: '뉴스 인사이트', status: '규칙 기반 · 실제 AI 미연결', original: '원문 제목', issue: '핵심 이슈', impact: '시장 영향', candidates: '관련 관찰 후보', none: '종목 단위 후보 없음', horizons: '검토 기간', short: '단기', swing: '스윙', long: '장기', risks: '위험 및 한계', source: '원문 출처 열기', demo: '데모 인사이트', actions: ['AI 한국어 요약 · 예정', 'AI 영향 분석 · 예정', '후보 리포트 생성 · 예정'], helper: '향후 유료 AI 기능입니다. 결제나 AI 요청은 발생하지 않습니다.' },
} as const

export function NewsInsightPanel({ insight, language, compact = false }: NewsInsightPanelProps) {
  const t = copy[language]
  return <section className={styles.panel} data-compact={compact} aria-label={t.title}>
    <header><div><span>{t.title}</span><strong>{t.status}</strong></div>{insight.isDemo && <em>{t.demo}</em>}</header>
    <div className={styles.original}><span>{t.original}</span><b>{insight.originalTitle}</b><small>{insight.source} · {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(insight.publishedAt))}</small></div>
    {!compact && <p className={styles.placeholder}>{insight.koreanSummaryPlaceholder}</p>}
    <div className={styles.grid}><article><span>{t.issue}</span><p>{insight.keyIssue}</p></article><article><span>{t.impact}</span><p>{insight.marketImpact}</p></article></div>
    <div className={styles.candidates}><span>{t.candidates} · {insight.candidateScope}</span><div>{insight.relatedCandidateSymbols.length ? insight.relatedCandidateSymbols.map((symbol) => <b key={symbol}>{symbol}</b>) : <small>{t.none}</small>}</div></div>
    {!compact && <><section className={styles.horizons}><h3>{t.horizons}</h3><div><p><b>{t.short}</b>{insight.shortTermView}</p><p><b>{t.swing}</b>{insight.swingView}</p><p><b>{t.long}</b>{insight.longTermView}</p></div></section><section className={styles.risks}><h3>{t.risks}</h3><ul>{[...insight.risks, ...insight.caveats].map((item) => <li key={item}>{item}</li>)}</ul></section></>}
    {!compact && <div className={styles.actions}>{t.actions.map((label) => <button key={label} type="button" disabled>{label}</button>)}<small>{t.helper}</small></div>}
    <footer><small>{insight.disclaimer}</small>{insight.sourceUrl && <a href={insight.sourceUrl} target="_blank" rel="noopener noreferrer">{t.source} ↗</a>}</footer>
  </section>
}

