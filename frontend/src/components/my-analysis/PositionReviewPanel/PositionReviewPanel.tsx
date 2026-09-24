import type { Language } from '@/i18n/translations'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import { derivePositionReview } from './positionReviewModel'
import styles from './PositionReviewPanel.module.css'

interface PositionReviewPanelProps {
  basisPrice: number | null
  currentPrice: number
  dataQuality: AnalysisDataQuality
  language: Language
  nextCheck: string
  quoteCurrency: string
}

const copy = {
  en: {
    title: 'Position review', helper: 'Enter your basis price to review the asset from your holding perspective.', basis: 'My basis price', current: 'Current price', change: 'Change from basis', state: 'Position state', next: 'Next check', caution: 'This is not a trade instruction.', states: { waiting: 'Waiting / checking conditions', baselineValid: 'Baseline still valid', invalidationReview: 'Invalidation basis review', profitProtection: 'Profit protection review' },
  },
  ko: {
    title: '보유 종목 점검', helper: '내 기준가를 입력하면 보유 종목 기준으로 점검할 수 있습니다.', basis: '내 기준가', current: '현재가', change: '기준가 대비', state: '보유 상태', next: '다음 확인', caution: '이 내용은 거래 지시가 아닙니다.', states: { waiting: '대기 / 조건 확인 중', baselineValid: '기준 유지 점검', invalidationReview: '무효화 기준 점검', profitProtection: '수익 보호 검토' },
  },
} as const

function formatValue(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)
}

export function PositionReviewPanel({ basisPrice, currentPrice, dataQuality, language, nextCheck, quoteCurrency }: PositionReviewPanelProps) {
  const t = copy[language]
  const review = derivePositionReview(currentPrice, basisPrice, dataQuality)

  return <section className={styles.panel} data-state={review.state} aria-label={t.title}>
    <header><span>{t.state}</span><h2>{t.title}</h2></header>
    {basisPrice === null || !Number.isFinite(basisPrice) || basisPrice <= 0 ? <p className={styles.helper}>{t.helper}</p> : <>
      <div className={styles.metrics}>
        <div><small>{t.basis}</small><strong>{formatValue(basisPrice, language)} {quoteCurrency}</strong></div>
        <div><small>{t.current}</small><strong>{Number.isFinite(currentPrice) ? `${formatValue(currentPrice, language)} ${quoteCurrency}` : '—'}</strong></div>
        <div><small>{t.change}</small><strong>{review.percentChange === null || review.difference === null ? '—' : `${review.percentChange >= 0 ? '+' : ''}${formatValue(review.percentChange, language)}% · ${review.difference >= 0 ? '+' : ''}${formatValue(review.difference, language)} ${quoteCurrency}`}</strong></div>
      </div>
      <div className={styles.result}><small>{t.state}</small><strong>{t.states[review.state]}</strong></div>
      <div className={styles.next}><strong>{t.next}</strong><span>{nextCheck}</span></div>
    </>}
    <footer>{t.caution}</footer>
  </section>
}
