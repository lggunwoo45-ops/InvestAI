import type { Language } from '@/i18n/translations'
import type { CandidateQualityGateReason } from '@/services/candidateSnapshot/candidateQualityGate'
import type { BitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import type { NewsProviderState } from '@/services/news/newsService'
import type { MarketBucketId } from '@/types/marketBucket'
import styles from './MarketContextStrip.module.css'

interface MarketContextStripProps {
  bucketId: MarketBucketId
  bucketLabel: string
  bitcoinAnchor: BitcoinMarketAnchor | null
  displayedCount: number
  excludedCount: number
  reasonCounts: Readonly<Partial<Record<CandidateQualityGateReason, number>>>
  dataState: 'live' | 'mock' | 'unavailable'
  newsState: NewsProviderState | null
  language: Language
}

const copy = {
  en: {
    title: 'Market context', anchor: 'BTC anchor flow', bucket: 'Market bucket summary', quality: 'Candidate quality', checks: 'Key checks', current: 'BTC price', read: 'Current read', score: 'Review score', displayed: 'displayed', excluded: 'excluded', limited: 'Only candidates that pass the current review basis are shown.', zero: 'There are no displayable interest candidates for this market bucket today. The list is not filled with weak candidates.', dart: 'DART: instrument-level review in My Analysis', news: 'News', data: 'Data', unavailable: 'Unavailable', noIssues: 'No additional quality exclusions', anchorSafety: 'Market context before reviewing crypto candidates. Not a trade instruction.', states: { live: 'Live', mock: 'Mock / limited', unavailable: 'Unavailable' },
    reasons: { invalidPrice: 'Current price unavailable', insufficientBasis: 'Review basis insufficient', unavailableScore: 'Review score unavailable', belowThreshold: 'Review score below the display threshold', insufficientData: 'Data quality insufficient', basisUnavailable: 'Current review basis unavailable' },
    newsStates: { mock: 'Mock source', 'rss-ready': 'RSS available', 'rss-unavailable': 'RSS unavailable', 'local-proxy-ready': 'Local proxy available', 'local-proxy-unavailable': 'Local proxy unavailable', 'provider-not-configured': 'Provider not configured' },
  },
  ko: {
    title: '시장 기준', anchor: 'BTC 기준 흐름', bucket: '시장군 요약', quality: '후보 품질', checks: '주요 확인', current: 'BTC 현재가', read: '지금 판단', score: '검토 점수', displayed: '표시', excluded: '제외', limited: '현재 데이터 기준으로 검토 가능한 후보만 표시합니다.', zero: '오늘은 이 시장군에서 표시 가능한 관심 후보가 없습니다. 무리해서 후보를 채우지 않습니다.', dart: 'DART: 내 종목 분석에서 종목별 확인', news: '뉴스', data: '데이터', unavailable: '사용 불가', noIssues: '추가 품질 제외 사유 없음', anchorSafety: '코인 후보 확인 전 참고하는 시장 기준 정보입니다. 거래 지시가 아닙니다.', states: { live: '실시간', mock: '모의 / 제한', unavailable: '사용 불가' },
    reasons: { invalidPrice: '현재 가격 확인 불가', insufficientBasis: '판단 근거 부족', unavailableScore: '검토 점수 산정 불가', belowThreshold: '검토 점수가 표시 기준 미만', insufficientData: '데이터 품질 부족', basisUnavailable: '현재 판단 근거 확인 불가' },
    newsStates: { mock: '모의 뉴스', 'rss-ready': 'RSS 사용 가능', 'rss-unavailable': 'RSS 사용 불가', 'local-proxy-ready': '로컬 프록시 사용 가능', 'local-proxy-unavailable': '로컬 프록시 사용 불가', 'provider-not-configured': '뉴스 제공자 미설정' },
  },
} as const

function number(value: number | null, language: Language, digits = 4) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: digits }).format(value)
}

export function MarketContextStrip({ bucketId, bucketLabel, bitcoinAnchor, displayedCount, excludedCount, reasonCounts, dataState, newsState, language }: MarketContextStripProps) {
  const t = copy[language]
  const crypto = bucketId === 'upbit' || bucketId === 'binance'
  const firstReason = (Object.entries(reasonCounts) as [CandidateQualityGateReason, number][]).find(([, count]) => count > 0)?.[0] ?? null
  const newsLabel = newsState ? t.newsStates[newsState] : t.unavailable
  return <section className={styles.strip} aria-label={t.title} data-asset-context={crypto ? 'crypto' : 'stock'}>
    {crypto && bitcoinAnchor && <section className={styles.anchor} aria-label={language === 'ko' ? '비트코인 시장 기준' : 'Bitcoin market anchor'} data-market-bucket={bucketId}>
      <div className={styles.sectionTitle}><span>{t.anchor}</span><strong>{bitcoinAnchor.symbol}</strong></div>
      <dl><div><dt>{t.current}</dt><dd>{number(bitcoinAnchor.currentPrice, language)} {bitcoinAnchor.currentPrice === null ? '' : bitcoinAnchor.symbol.split('/')[1]}</dd></div><div><dt>{t.read}</dt><dd>{bitcoinAnchor.practicalDecision.title}</dd></div><div><dt>{t.score}</dt><dd>{bitcoinAnchor.reviewScore.score === null ? '—' : `${bitcoinAnchor.reviewScore.score}/100`}</dd></div></dl>
      <p>{bitcoinAnchor.summary}</p>
      <p className={styles.anchorCaution}>{bitcoinAnchor.caution}</p>
      <small className={styles.anchorSafety}>{t.anchorSafety}</small>
    </section>}
    <section className={styles.bucket} aria-label={language === 'ko' ? '시장군 요약' : 'Market bucket summary'}>
      <div className={styles.sectionTitle}><span>{t.bucket}</span><h2>{bucketLabel}</h2></div>
      <div className={styles.counts}><b>{displayedCount}</b><span>{t.displayed}</span><i>/</i><b>{excludedCount}</b><span>{t.excluded}</span></div>
      <p>{displayedCount === 0 ? t.zero : t.limited}</p>
    </section>
    <section className={styles.quality} aria-label={t.quality}>
      <div className={styles.sectionTitle}><span>{t.quality}</span><strong>{displayedCount < 5 ? `${displayedCount}/5` : '5/5'}</strong></div>
      <div className={styles.pulse} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} data-active={index < displayedCount || undefined} />)}</div>
      <p>{firstReason ? t.reasons[firstReason] : t.noIssues}</p>
    </section>
    <section className={styles.checks} aria-label={t.checks}>
      <div className={styles.sectionTitle}><span>{t.checks}</span><strong>{t.states[dataState]}</strong></div>
      <p>{t.data}: {t.states[dataState]} · {t.news}: {newsLabel}</p>
      {!crypto && bucketId !== 'usStocks' && <p>{t.dart}</p>}
    </section>
  </section>
}
