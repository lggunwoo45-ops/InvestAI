import { useState } from 'react'

import type { Language } from '@/i18n/translations'
import type { DailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import { getDailyBasisTime } from '@/services/candidateSnapshot/dailyBasisTime'
import type { CandidateTerminalItem } from './candidateTerminalModel'
import styles from './CandidateTerminalList.module.css'

interface CandidateTerminalListProps {
  snapshot: DailyBucketSnapshot | null
  items: readonly CandidateTerminalItem[]
  selectedInstrumentId: string | null
  language: Language
  now: string
  canRecalculate: boolean
  beforeTodayBasis: boolean
  contextKey: string
  onSelect: (instrumentId: string) => void
  onRecalculate: () => void
}

const copy = {
  en: { title: 'Today’s interest candidates', previous: 'Interest candidates from this record', panelToday: 'Today’s 08:00 snapshot record', panelPrevious: 'Previous daily snapshot record', symbol: 'Symbol', price: 'Price', change: 'Change since basis', score: 'Review score', read: 'Current read', range: 'Review range', advanced: 'Advanced: Recalculate today’s candidates', confirm: 'Recalculating today’s candidate record will replace the existing candidates. Press again to continue.', fixed: 'Saved candidates and order stay fixed until advanced recalculation.', previousNote: 'This is a previous daily record. Current data may differ.', expiredNote: 'This saved record has expired and should be read as historical context.', fewer: 'Only candidates that pass the current review basis are shown.', zero: 'There are no displayable interest candidates for this market bucket today. The list is not filled with weak candidates.', pending: 'Today’s candidate record is preparing. Recalculate after 08:00 if needed.', notReady: 'No daily candidate record is available yet. Use advanced recalculation when market data is ready.', boundary: 'Review score describes available review evidence, not return probability. Review ranges are reference areas, not order prices.', rangeUnavailable: 'Unavailable', select: 'Select' },
  ko: { title: '오늘의 관심 후보', previous: '이 기록의 관심 후보', panelToday: '오늘 08:00 기준 기록', panelPrevious: '이전 날짜 기준 기록', symbol: '종목', price: '현재가', change: '기준 이후 변화', score: '검토 점수', read: '지금 판단', range: '검토 범위', advanced: '고급: 오늘 후보 다시 계산', confirm: '오늘 후보 기준 기록을 다시 계산하면 기존 후보가 교체됩니다. 계속하려면 한 번 더 눌러주세요.', fixed: '저장된 후보와 순서는 고급 재계산 전까지 유지됩니다.', previousNote: '이전 날짜의 기준 기록입니다. 현재 데이터와 다를 수 있습니다.', expiredNote: '만료된 기준 기록이므로 과거 참고 정보로 확인하세요.', fewer: '현재 데이터 기준으로 검토 가능한 후보만 표시합니다.', zero: '오늘은 이 시장군에서 표시 가능한 관심 후보가 없습니다. 무리해서 후보를 채우지 않습니다.', pending: '오늘 후보 기준 기록을 준비 중입니다. 필요한 경우 08:00 이후 다시 계산하세요.', notReady: '아직 일일 후보 기준 기록이 없습니다. 시장 데이터가 준비되면 고급 재계산을 사용하세요.', boundary: '검토 점수는 확인 가능한 검토 근거를 나타내며 수익 확률이 아닙니다. 검토 범위는 주문가가 아닌 참고 영역입니다.', rangeUnavailable: '확인 불가', select: '선택' },
} as const

function number(value: number | null, language: Language) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)
}

export function CandidateTerminalList({ snapshot, items, selectedInstrumentId, language, now, canRecalculate, beforeTodayBasis, contextKey, onSelect, onRecalculate }: CandidateTerminalListProps) {
  const t = copy[language]
  const isToday = Boolean(snapshot?.tradingDate === getDailyBasisTime(new Date(now)).tradingDateLabel)
  const expired = Boolean(snapshot && Date.parse(now) > Date.parse(snapshot.expiresAt))
  const [pendingContextKey, setPendingContextKey] = useState<string | null>(null)
  const confirmationPending = pendingContextKey === contextKey
  const recalculate = () => {
    if (!confirmationPending) return setPendingContextKey(contextKey)
    setPendingContextKey(null)
    onRecalculate()
  }
  return <section className={styles.panel} aria-label={isToday || !snapshot ? t.panelToday : t.panelPrevious} data-terminal-list>
    <header><div><span>{isToday || !snapshot ? t.panelToday : t.panelPrevious}</span><h2>{isToday ? t.title : snapshot ? t.previous : t.title}</h2><p>{snapshot ? isToday ? t.fixed : t.previousNote : beforeTodayBasis ? t.pending : t.notReady}</p></div><button type="button" className={styles.recalculate} disabled={!canRecalculate} onClick={recalculate}>{t.advanced}</button></header>
    {confirmationPending && <p className={styles.confirmation} role="status">{t.confirm}</p>}
    {expired && <p className={styles.stale}>{t.expiredNote}</p>}
    {snapshot && items.length > 0 && items.length < 5 && <p className={styles.limit} role="status">{t.fewer}</p>}
    {snapshot && items.length === 0 && <p className={styles.empty} role="status">{t.zero}</p>}
    {!snapshot && <p className={styles.empty} role="status">{beforeTodayBasis ? t.pending : t.notReady}</p>}
    <div className={styles.columns} aria-hidden="true"><span>{t.symbol}</span><span>{t.price}</span><span>{t.change}</span><span>{t.score}</span><span>{t.read}</span><span>{t.range}</span></div>
    <p className={styles.boundary}>{t.boundary}</p>
    <ol className={styles.rows}>{items.map((candidate) => {
      const item = candidate.item
      const firstRange = candidate.reviewRanges[0]
      const change = candidate.changeSinceBasis === null ? '—' : `${candidate.changeSinceBasis >= 0 ? '+' : ''}${number(candidate.changeSinceBasis, language)} ${item.quoteCurrency}`
      const range = firstRange && firstRange.lowPrice !== null && firstRange.highPrice !== null ? `${number(firstRange.lowPrice, language)}–${number(firstRange.highPrice, language)} ${item.quoteCurrency}` : t.rangeUnavailable
      return <li key={item.instrumentId} data-selected={selectedInstrumentId === item.instrumentId || undefined}>
        <button type="button" className={styles.select} aria-label={`${t.select} ${item.symbol}; ${t.price}: ${number(candidate.currentPrice, language)} ${item.quoteCurrency}; ${t.change}: ${change}; ${t.score}: ${candidate.reviewScore.score === null ? '—' : `${candidate.reviewScore.score}/100`}; ${t.read}: ${candidate.practicalDecision.title}; ${t.range}: ${range}`} aria-pressed={selectedInstrumentId === item.instrumentId} onClick={() => onSelect(item.instrumentId)}>
          <span className={styles.identity}><strong>{item.symbol}</strong><small>{item.displayName}</small><em>{item.reasonText}</em></span>
          <span className={styles.numeric}><strong>{number(candidate.currentPrice, language)}</strong><small>{item.quoteCurrency}</small></span>
          <span className={styles.numeric}>{change}</span>
          <span className={styles.score}>{candidate.reviewScore.score === null ? '—' : `${candidate.reviewScore.score}/100`}</span>
          <span className={styles.read}>{candidate.practicalDecision.title}</span>
          <span className={styles.range}>{range}</span>
        </button>
      </li>
    })}</ol>
  </section>
}
