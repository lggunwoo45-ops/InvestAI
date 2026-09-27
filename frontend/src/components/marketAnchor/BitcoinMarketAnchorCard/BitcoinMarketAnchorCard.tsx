import { CandidateReviewScoreBadge } from '@/components/candidates/CandidateReviewScoreBadge/CandidateReviewScoreBadge'
import type { Language } from '@/i18n/translations'
import type { BitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import styles from './BitcoinMarketAnchorCard.module.css'

interface BitcoinMarketAnchorCardProps {
  anchor: BitcoinMarketAnchor
  language: Language
}

const copy = {
  en: { eyebrow: 'CRYPTO MARKET CONTEXT', title: 'Bitcoin market anchor', flow: 'Current BTC flow', current: 'Current price', change: '24H change', decision: 'Current read', context: 'Market context before reviewing crypto candidates', caution: 'Market context only, not a trade instruction.', states: { ready: 'Anchor available', limited: 'Anchor data limited', unavailable: 'Bitcoin anchor unavailable' } },
  ko: { eyebrow: '코인 시장 맥락', title: '비트코인 시장 기준', flow: '현재 BTC 흐름', current: '현재가', change: '24시간 변화', decision: '지금 판단', context: '코인 후보 확인 전 참고 기준', caution: '거래 지시가 아닌 시장 기준 정보입니다.', states: { ready: '기준 확인 가능', limited: '기준 데이터 제한', unavailable: '비트코인 기준 확인 불가' } },
} as const

function number(value: number | null, language: Language, maximumFractionDigits = 4) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits }).format(value)
}

export function BitcoinMarketAnchorCard({ anchor, language }: BitcoinMarketAnchorCardProps) {
  const t = copy[language]
  return <section className={styles.card} data-status={anchor.status} aria-label={t.title}>
    <header>
      <div><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{t.context}</p></div>
      <b>{t.states[anchor.status]}</b>
    </header>
    <div className={styles.content}>
      <div className={styles.flow}><small>{t.flow}</small><strong>{anchor.symbol}</strong><p>{anchor.summary}</p></div>
      <dl><div><dt>{t.current}</dt><dd>{number(anchor.currentPrice, language)}{anchor.currentPrice !== null ? ` ${anchor.symbol.split('/')[1] ?? ''}` : ''}</dd></div><div><dt>{t.change}</dt><dd>{anchor.change24hPercent === null ? '—' : `${anchor.change24hPercent >= 0 ? '+' : ''}${number(anchor.change24hPercent, language, 2)}%`}</dd></div><div><dt>{t.decision}</dt><dd>{anchor.practicalDecision.title}</dd></div></dl>
      <CandidateReviewScoreBadge result={anchor.reviewScore} language={language} />
    </div>
    <footer><p>{anchor.caution}</p><small>{t.caution}</small></footer>
  </section>
}
