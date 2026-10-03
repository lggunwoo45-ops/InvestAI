import type { Language } from '@/i18n/translations'
import type { CandidateDisplayFilter, CandidateDisplayReason } from '@/services/candidateSnapshot/candidateDisplayClassification'
import type { BitcoinMarketAnchor } from '@/services/marketAnchor/bitcoinMarketAnchor'
import type { NewsProviderState } from '@/services/news/newsService'
import type { MarketBucketId } from '@/types/marketBucket'
import styles from './MarketContextStrip.module.css'

interface MarketContextStripProps {
  bucketId: MarketBucketId
  bucketLabel: string
  bitcoinAnchor: BitcoinMarketAnchor | null
  displayedCount: number
  heldCount?: number
  excludedCount: number
  heldReasonCounts?: Readonly<Partial<Record<CandidateDisplayReason, number>>>
  excludedReasonCounts?: Readonly<Partial<Record<CandidateDisplayReason, number>>>
  displayFilter?: CandidateDisplayFilter
  onDisplayFilterChange?: (filter: CandidateDisplayFilter) => void
  dataState: 'live' | 'mock' | 'unavailable'
  newsState: NewsProviderState | null
  language: Language
}

const copy = {
  en: {
    title: 'Market context', anchor: 'BTC anchor flow', bucket: 'Candidate quality summary', quality: 'Display filter', checks: 'Key checks', current: 'BTC price', read: 'Current read', score: 'Review score', displayed: 'Displayed', held: 'Held for review', excluded: 'Excluded', limited: 'Only candidates that pass the current review basis are shown.', notFilled: 'The list is not filled with weak candidates.', scanBoundary: 'Counts describe the current quality scan. The saved daily list stays fixed until refreshed.', dart: 'DART: instrument-level review in My Analysis', news: 'News', data: 'Data', unavailable: 'Unavailable', noIssues: 'No additional quality exclusions', anchorSafety: 'Market context before reviewing crypto candidates. Not a trade instruction.', states: { live: 'Live', mock: 'Mock / limited', unavailable: 'Unavailable' },
    filters: { strict: 'Strict', standard: 'Standard', wider: 'Wider view' },
    filterHelp: { strict: 'Review score 70 or above', standard: 'Review score 60 or above', wider: 'Standard candidates plus a separate held list' },
    reasons: { currentPriceUnavailable: 'Current price unavailable', reviewBasisInsufficient: 'Review basis insufficient', reviewScoreTooLow: 'Review score too low', dataQualityInsufficient: 'Data quality insufficient', currentBasisUnavailable: 'Current basis unavailable' },
    newsStates: { mock: 'Mock source', 'rss-ready': 'RSS available', 'rss-unavailable': 'RSS unavailable', 'local-proxy-ready': 'Local proxy available', 'local-proxy-unavailable': 'Local proxy unavailable', 'provider-not-configured': 'Provider not configured' },
  },
  ko: {
    title: '시장 기준', anchor: 'BTC 기준 흐름', bucket: '후보 품질 요약', quality: '표시 기준', checks: '주요 확인', current: 'BTC 현재가', read: '지금 판단', score: '검토 점수', displayed: '표시 후보', held: '보류 후보', excluded: '제외 후보', limited: '현재 데이터 기준으로 검토 가능한 후보만 표시합니다.', notFilled: '무리해서 5개를 채우지 않습니다.', scanBoundary: '수치는 현재 품질 검토 기준입니다. 저장된 일일 후보는 새로고침 전까지 유지됩니다.', dart: 'DART: 내 종목 분석에서 종목별 확인', news: '뉴스', data: '데이터', unavailable: '사용 불가', noIssues: '추가 품질 제외 사유 없음', anchorSafety: '코인 후보 확인 전 참고하는 시장 기준 정보입니다. 거래 지시가 아닙니다.', states: { live: '실시간', mock: '모의 / 제한', unavailable: '사용 불가' },
    filters: { strict: '엄격', standard: '표준', wider: '넓게 보기' },
    filterHelp: { strict: '검토 점수 70점 이상', standard: '검토 점수 60점 이상', wider: '표준 후보와 보류 후보를 구분해 표시' },
    reasons: { currentPriceUnavailable: '현재 가격 확인 불가', reviewBasisInsufficient: '판단 근거 부족', reviewScoreTooLow: '검토 점수 부족', dataQualityInsufficient: '데이터 품질 부족', currentBasisUnavailable: '현재 기준 비교 불가' },
    newsStates: { mock: '모의 뉴스', 'rss-ready': 'RSS 사용 가능', 'rss-unavailable': 'RSS 사용 불가', 'local-proxy-ready': '로컬 프록시 사용 가능', 'local-proxy-unavailable': '로컬 프록시 사용 불가', 'provider-not-configured': '뉴스 제공자 미설정' },
  },
} as const

function number(value: number | null, language: Language, digits = 4) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: digits }).format(value)
}

const filters: readonly CandidateDisplayFilter[] = ['strict', 'standard', 'wider']

function labelledReasons(reasonCounts: Readonly<Partial<Record<CandidateDisplayReason, number>>>, labels: Readonly<Record<CandidateDisplayReason, string>>) {
  return (Object.entries(reasonCounts) as [CandidateDisplayReason, number][]).filter(([, count]) => count > 0).map(([reason, count]) => [labels[reason], count] as const)
}

export function MarketContextStrip({ bucketId, bucketLabel, bitcoinAnchor, displayedCount, heldCount = 0, excludedCount, heldReasonCounts = {}, excludedReasonCounts = {}, displayFilter = 'standard', onDisplayFilterChange, dataState, newsState, language }: MarketContextStripProps) {
  const t = copy[language]
  const crypto = bucketId === 'upbit' || bucketId === 'binance'
  const heldReasons = labelledReasons(heldReasonCounts, t.reasons)
  const excludedReasons = labelledReasons(excludedReasonCounts, t.reasons)
  const newsLabel = newsState ? t.newsStates[newsState] : t.unavailable
  return <section className={styles.strip} aria-label={t.title} data-asset-context={crypto ? 'crypto' : 'stock'}>
    {crypto && bitcoinAnchor && <section className={styles.anchor} aria-label={language === 'ko' ? '비트코인 시장 기준' : 'Bitcoin market anchor'} data-market-bucket={bucketId}>
      <div className={styles.sectionTitle}><span>{t.anchor}</span><strong>{bitcoinAnchor.symbol}</strong></div>
      <dl><div><dt>{t.current}</dt><dd>{number(bitcoinAnchor.currentPrice, language)} {bitcoinAnchor.currentPrice === null ? '' : bitcoinAnchor.symbol.split('/')[1]}</dd></div><div><dt>{t.read}</dt><dd>{bitcoinAnchor.practicalDecision.title}</dd></div><div><dt>{t.score}</dt><dd>{bitcoinAnchor.reviewScore.score === null ? '—' : `${bitcoinAnchor.reviewScore.score}/100`}</dd></div></dl>
      <p>{bitcoinAnchor.summary}</p>
      <p className={styles.anchorCaution}>{bitcoinAnchor.caution}</p>
      <small className={styles.anchorSafety}>{t.anchorSafety}</small>
    </section>}
    <section className={styles.bucket} aria-label={t.bucket}>
      <div className={styles.sectionTitle}><span>{t.bucket}</span><h2>{bucketLabel}</h2></div>
      <div className={styles.counts}><span><b>{displayedCount}</b>{t.displayed}</span><i>/</i><span><b>{heldCount}</b>{t.held}</span><i>/</i><span><b>{excludedCount}</b>{t.excluded}</span></div>
      <p>{t.limited} {t.notFilled}</p>
      <small>{t.scanBoundary}</small>
    </section>
    <section className={styles.quality} aria-label={t.quality}>
      <div className={styles.sectionTitle}><span>{t.quality}</span><strong>{t.filters[displayFilter]}</strong></div>
      <div className={styles.filters} role="group" aria-label={t.quality}>{filters.map((filter) => <button key={filter} type="button" aria-pressed={displayFilter === filter} title={t.filterHelp[filter]} onClick={() => onDisplayFilterChange?.(filter)}>{t.filters[filter]}</button>)}</div>
      <p>{t.filterHelp[displayFilter]}</p>
      {heldReasons.length + excludedReasons.length > 0 ? <ul className={styles.reasons}>
        {heldReasons.map(([label, count]) => <li key={`held-${label}`}><span>{t.held}</span>{label} <b>{count}</b></li>)}
        {excludedReasons.map(([label, count]) => <li key={`excluded-${label}`}><span>{t.excluded}</span>{label} <b>{count}</b></li>)}
      </ul> : <p>{t.noIssues}</p>}
    </section>
    <section className={styles.checks} aria-label={t.checks}>
      <div className={styles.sectionTitle}><span>{t.checks}</span><strong>{t.states[dataState]}</strong></div>
      <p>{t.data}: {t.states[dataState]} · {t.news}: {newsLabel}</p>
      {!crypto && bucketId !== 'usStocks' && <p>{t.dart}</p>}
    </section>
  </section>
}
