import type { Language } from '@/i18n/translations'
import type { ReviewRange } from '@/types/practicalDecision'
import styles from './ReviewRangePanel.module.css'

interface ReviewRangePanelProps { ranges: readonly ReviewRange[]; language: Language; quoteCurrency: string; compact?: boolean; showSafety?: boolean }
const copy = { en: { title: 'Review ranges', unavailable: 'Review range unavailable', unavailableHelp: 'Live market data is missing. Other analysis remains available; check the data mode or source and try again.', caution: 'Review ranges are decision-support areas, not order prices.' }, ko: { title: '검토 범위', unavailable: '검토 범위 생성 불가', unavailableHelp: '실시간 시장 데이터가 부족합니다. 다른 분석은 계속 사용할 수 있으며, 데이터 모드나 출처를 확인한 뒤 다시 시도하세요.', caution: '검토 범위는 주문가가 아니라 판단 보조용입니다.' } } as const
const format = (value: number, language: Language) => new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)

export function ReviewRangePanel({ ranges, language, quoteCurrency, compact = false, showSafety = true }: ReviewRangePanelProps) {
  const t = copy[language]
  return <section className={styles.panel} data-compact={compact || undefined} aria-label={t.title}><header><span>{t.title}</span><h3>{t.title}</h3></header>
    {ranges.length ? <div className={styles.ranges}>{ranges.slice(0, 3).map((range) => <article key={range.kind}><strong>{range.label}</strong><b>{format(range.lowPrice!, language)} ~ {format(range.highPrice!, language)} {quoteCurrency}</b><small>{range.description}</small></article>)}</div> : <div className={styles.empty} role="status"><strong>{t.unavailable}</strong><span>{t.unavailableHelp}</span></div>}
    {showSafety && <small className={styles.boundary}>{t.caution}</small>}
  </section>
}
