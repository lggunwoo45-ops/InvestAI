import type { Language } from '@/i18n/translations'
import type { ReviewRange } from '@/types/practicalDecision'
import styles from './ReviewRangePanel.module.css'

interface ReviewRangePanelProps { ranges: readonly ReviewRange[]; language: Language; quoteCurrency: string; compact?: boolean }
const copy = { en: { title: 'Review ranges', unavailable: 'Review range unavailable', unavailableHelp: 'Reliable live price data is required before review ranges can be created.', caution: 'These are review ranges, not order prices.' }, ko: { title: '검토 범위', unavailable: '검토 범위 생성 불가', unavailableHelp: '신뢰 가능한 실시간 가격 데이터가 있어야 검토 범위를 만들 수 있습니다.', caution: '주문가가 아닌 검토 범위입니다.' } } as const
const format = (value: number, language: Language) => new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)

export function ReviewRangePanel({ ranges, language, quoteCurrency, compact = false }: ReviewRangePanelProps) {
  const t = copy[language]
  return <section className={styles.panel} data-compact={compact || undefined} aria-label={t.title}><header><span>{t.title}</span><h3>{t.title}</h3></header>
    {ranges.length ? <><div className={styles.ranges}>{ranges.slice(0, 3).map((range) => <article key={range.kind}><strong>{range.label}</strong><b>{format(range.lowPrice!, language)} ~ {format(range.highPrice!, language)} {quoteCurrency}</b><small>{range.description}</small></article>)}</div><p>{ranges[0].caution}</p></> : <div className={styles.empty} role="status"><strong>{t.unavailable}</strong><span>{t.unavailableHelp}</span></div>}
    <small className={styles.boundary}>{t.caution}</small>
  </section>
}
