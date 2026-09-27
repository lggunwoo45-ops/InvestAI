import type { Language } from '@/i18n/translations'
import { PracticalDecisionCard } from '@/components/practicalDecision/PracticalDecisionCard/PracticalDecisionCard'
import { ReviewRangePanel } from '@/components/practicalDecision/ReviewRangePanel/ReviewRangePanel'
import { evaluateCandidateSnapshotFreshness } from '@/services/candidateSnapshot/candidateSnapshotFreshness'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildReviewRanges } from '@/services/practicalDecision/reviewRangeModel'
import type { CandidateSnapshot, CandidateSnapshotCurrentState } from '@/types/candidateSnapshot'
import type { DailyBucketSnapshot } from '@/services/candidateSnapshot/dailyBucketSnapshot'
import type { WatchCandidateHorizon } from '@/types/watchCandidate'
import styles from './CandidateSnapshotPanel.module.css'

interface CandidateSnapshotPanelProps {
  snapshot: CandidateSnapshot | DailyBucketSnapshot | null
  currentStates: ReadonlyMap<string, CandidateSnapshotCurrentState>
  currentPrices?: ReadonlyMap<string, number>
  horizon?: WatchCandidateHorizon
  language: Language
  now: string
  canRefresh: boolean
  onRefresh: () => void
  onOpenAnalysis: (instrumentId: string, snapshotId: string) => void
  variant?: 'standard' | 'daily'
  beforeTodayBasis?: boolean
}

const copy = {
  en: {
    title: 'Candidate snapshot record', listTitle: 'Interest candidate list', eyebrow: 'SNAPSHOT BASIS', disclaimer: (time: string) => `This list is a snapshot record from ${time}. It is not a current investment recommendation. It does not update automatically until refreshed.`, safety: 'Decision-support information, not a trade instruction or profit guarantee.', refresh: 'Refresh candidates', notReady: 'No candidate snapshot exists yet. Use Refresh candidates to create an interest candidate list from the current basis.', expiredTitle: 'Snapshot expired', expiredHelp: 'The saved list still works as historical context. Refresh candidates to create a current snapshot record.', expiredBoundary: 'This record reflects the earlier basis and should not be read as a current judgment.', basis: 'Basis', current: 'Current', change: 'Change since basis', basisTime: 'Recorded at', reason: 'Reason recorded', details: 'Rule basis and changed fields', open: 'Open analysis', changes: 'Changes found', none: 'No material evidence-state changes.', freshness: { basisHeld: 'Baseline held', changeReview: 'Change check needed', expired: 'Snapshot expired', priceUnavailable: 'Current price unavailable', reviewBasisUnavailable: 'Current review basis unavailable' }, reviewBasisHelp: 'Current price is available, but the current review basis could not be compared with the snapshot record. The saved snapshot remains available.', stages: { waiting: 'Waiting / checking conditions', first: 'Observation start', second: 'Conditions forming', third: 'Conditions clear', chaseCaution: 'Movement expansion caution', reboundCaution: 'Sharp-drop rebound caution' }, fields: { ruleBasis: 'Rule basis', interestStage: 'Interest stage', actionStatus: 'Action status', dataQuality: 'Data quality' },
  },
  ko: {
    title: '후보 기준 기록', listTitle: '관심 후보 목록', eyebrow: '스냅샷 기준', disclaimer: (time: string) => `이 목록은 ${time} 시점의 기준 기록이며, 현재 시점의 투자 권유가 아닙니다. 후보 새로고침 전까지 자동으로 갱신되지 않습니다.`, safety: '판단 보조 정보이며, 거래 지시나 수익 보장이 아닙니다.', refresh: '후보 새로고침', notReady: '후보 기준 기록이 아직 없습니다. 후보 새로고침을 눌러 현재 기준의 관심 후보 목록을 만들 수 있습니다.', expiredTitle: '기준 시점이 오래됨', expiredHelp: '저장된 목록은 과거 참고 기록으로 계속 볼 수 있습니다. 후보 새로고침으로 최신 기준 기록을 만드세요.', expiredBoundary: '이 기록은 당시 기준이며 현재 판단으로 해석하지 마세요.', basis: '기준', current: '현재', change: '기준 이후 변화', basisTime: '기록 시점', reason: '기록된 이유', details: '규칙 근거와 달라진 점', open: '분석 열기', changes: '달라진 점 있음', none: '근거 상태의 중요한 변화가 없습니다.', freshness: { basisHeld: '기준 유지', changeReview: '변화 확인 필요', expired: '기준 시점이 오래됨', priceUnavailable: '현재 가격 확인 불가', reviewBasisUnavailable: '현재 판단 근거 확인 불가' }, reviewBasisHelp: '현재 가격은 표시되지만, 기준 기록과 비교할 현재 판단 근거를 불러오지 못했습니다. 저장된 스냅샷은 계속 확인할 수 있습니다.', stages: { waiting: '대기 / 조건 확인 중', first: '관찰 시작', second: '조건 확인', third: '조건 뚜렷', chaseCaution: '변동 확대 주의', reboundCaution: '급락 반등 주의' }, fields: { ruleBasis: '규칙 근거', interestStage: '관심 단계', actionStatus: '액션 상태', dataQuality: '데이터 품질' },
  },
} as const

const dailyCopy = {
  en: { title: 'Today’s 08:00 snapshot record', listTitle: 'Today’s 5 interest candidates', eyebrow: 'DAILY MARKET BUCKET', disclaimer: 'This list is today’s 08:00 snapshot record. It does not change automatically until refreshed.', refresh: 'Refresh today’s candidates', notReady: 'Today’s interest candidates are not available yet. Use Refresh today’s candidates to create today’s snapshot record for this market bucket.', before: 'Today’s 08:00 snapshot record is not ready yet. Review the previous record or refresh after 08:00.', limited: 'Only candidates available from the current data are shown.' },
  ko: { title: '오늘 08:00 기준 기록', listTitle: '오늘의 관심 후보 5개', eyebrow: '일일 시장군 기준', disclaimer: '이 목록은 오늘 08:00 기준 기록입니다. 후보 새로고침 전까지 자동으로 바뀌지 않습니다.', refresh: '오늘 후보 새로고침', notReady: '오늘의 관심 후보가 아직 없습니다. 오늘 후보 새로고침을 눌러 이 시장군의 오늘 기준 기록을 만들 수 있습니다.', before: '오늘 08:00 기준 기록은 아직 준비되지 않았습니다. 이전 기준 기록을 확인하거나 08:00 이후 새로고침하세요.', limited: '현재 데이터에서 확인 가능한 후보만 표시합니다.' },
} as const

function number(value: number, language: Language) { return Number.isFinite(value) ? new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value) : '—' }
function time(value: string, language: Language) { return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }

export function CandidateSnapshotPanel({ snapshot, currentStates, currentPrices, horizon = 'short', language, now, canRefresh, onRefresh, onOpenAnalysis, variant = 'standard', beforeTodayBasis = false }: CandidateSnapshotPanelProps) {
  const t = copy[language]
  const daily = dailyCopy[language]
  const isDaily = variant === 'daily'
  const expired = Boolean(snapshot && Date.parse(now) > Date.parse(snapshot.expiresAt))
  const basisTime = snapshot && 'basisAt' in snapshot ? snapshot.basisAt : snapshot?.generatedAt
  return <section className={styles.panel} aria-label={isDaily ? daily.title : t.title} data-expired={expired || undefined} data-snapshot-variant={variant}>
    <header><div><span>{isDaily ? daily.eyebrow : t.eyebrow}</span><h2>{isDaily ? daily.title : t.title}</h2>{snapshot && <p>{isDaily ? daily.disclaimer : t.disclaimer(time(basisTime ?? snapshot.generatedAt, language))}</p>}</div><button type="button" disabled={!canRefresh} onClick={onRefresh}>{isDaily ? daily.refresh : t.refresh}</button></header>
    <p className={styles.safety}>{t.safety}</p>
    {!snapshot && <p className={styles.empty} role="status">{isDaily && beforeTodayBasis ? daily.before : isDaily ? daily.notReady : t.notReady}</p>}
    {snapshot && expired && <aside className={styles.staleNotice} role="status"><strong>{t.expiredTitle}</strong><span>{t.expiredHelp}</span><small>{t.expiredBoundary}</small></aside>}
    {snapshot && <section className={styles.listSection} aria-labelledby="candidate-snapshot-list-title"><h3 id="candidate-snapshot-list-title">{isDaily ? daily.listTitle : t.listTitle}</h3>{isDaily && snapshot.items.length < 5 && <p className={styles.empty} role="status">{daily.limited}</p>}<ol className={styles.list}>{[...snapshot.items].sort((left, right) => left.order - right.order).slice(0, 5).map((item) => {
      const current = currentStates.get(item.instrumentId) ?? null
      const statePrice = current?.currentPrice ?? null
      const referencePrice = currentPrices?.get(item.instrumentId) ?? null
      const currentPrice = statePrice !== null && Number.isFinite(statePrice) && statePrice > 0 ? statePrice
        : referencePrice !== null && Number.isFinite(referencePrice) && referencePrice > 0 ? referencePrice : null
      const freshness = evaluateCandidateSnapshotFreshness(item, current, snapshot.expiresAt, now, currentPrice)
      const difference = currentPrice !== null && Number.isFinite(currentPrice) ? currentPrice - item.basisPrice : null
      const decision = buildPracticalDecision({ language, horizon, dataQuality: item.dataQuality, actionStatus: item.actionStatus, interestStage: item.interestStage, freshness: freshness.state, movementBand: item.basisMovementBand, source: 'snapshot', reason: item.reasonText })
      const ranges = buildReviewRanges({ language, horizon, dataQuality: item.dataQuality, anchorPrice: item.basisPrice, source: 'snapshot', expired: freshness.state === 'expired' })
      return <li key={item.instrumentId} className={styles.card} data-freshness={freshness.state}>
        <div className={styles.identity}><div><strong>{item.symbol}</strong><span>{item.displayName} · {item.assetType}</span></div></div>
        <div className={styles.freshness}><span>{t.basisTime}: {time(snapshot.generatedAt, language)}</span><strong>{t.freshness[freshness.state]}</strong></div>
        {freshness.state === 'reviewBasisUnavailable' && <p className={styles.freshnessHelp}>{t.reviewBasisHelp}</p>}
        <PracticalDecisionCard result={decision} language={language} compact showSafety={false} />
        <div className={styles.values}><div><span>{t.basis}</span><strong>{number(item.basisPrice, language)} {item.quoteCurrency}</strong></div><div><span>{t.current}</span><strong>{currentPrice !== null ? `${number(currentPrice, language)} ${item.quoteCurrency}` : '—'}</strong></div><div><span>{t.change}</span><strong data-tone="neutral">{difference === null ? '—' : `${difference >= 0 ? '+' : ''}${number(difference, language)} ${item.quoteCurrency}`}</strong></div></div>
        <ReviewRangePanel ranges={ranges} language={language} quoteCurrency={item.quoteCurrency} compact showSafety={false} />
        <details><summary>{t.details}</summary><dl>{item.ruleBasis.map((entry) => <div key={entry.key}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl><h3>{freshness.changes.length ? t.changes : t.none}</h3>{freshness.changes.length > 0 && <ul>{freshness.changes.map((change) => <li key={change.field}>{t.fields[change.field]}: {change.previousValue} → {change.currentValue}</li>)}</ul>}</details>
        <footer><button type="button" onClick={() => onOpenAnalysis(item.instrumentId, snapshot.snapshotId)}>{t.open} →</button></footer>
      </li>
    })}</ol></section>}
  </section>
}
